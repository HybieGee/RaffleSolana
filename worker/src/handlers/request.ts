import { Env } from '../types'
import { getStatus } from '../services/status'
import { getRecentWinners } from '../services/winners'
import { calculateOdds } from '../services/odds'
import { forceDrawRaffle, retryPayout } from '../services/raffle'

export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (path === '/health') {
      return new Response('OK', { status: 200, headers: corsHeaders })
    }

    if (path === '/api/status') {
      const status = await getStatus(env)
      return new Response(JSON.stringify(status), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (path === '/api/winners') {
      const limit = parseInt(url.searchParams.get('limit') || '100')
      const winners = await getRecentWinners(env, limit)
      return new Response(JSON.stringify(winners), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (path === '/api/odds') {
      const wallet = url.searchParams.get('wallet')
      if (!wallet) {
        return new Response('Missing wallet parameter', { status: 400, headers: corsHeaders })
      }
      const odds = await calculateOdds(env, wallet)
      return new Response(JSON.stringify(odds), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (path === '/stream') {
      return handleSSE(env)
    }

    if (path === '/admin/force-draw' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization')
      if (!env.ADMIN_TOKEN || authHeader !== `Bearer ${env.ADMIN_TOKEN}`) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }
      await forceDrawRaffle(env)
      return new Response('Draw initiated', { status: 200, headers: corsHeaders })
    }

    if (path === '/admin/retry-payout' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization')
      if (!env.ADMIN_TOKEN || authHeader !== `Bearer ${env.ADMIN_TOKEN}`) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }
      const drawId = url.searchParams.get('draw_id')
      if (!drawId) {
        return new Response('Missing draw_id', { status: 400, headers: corsHeaders })
      }
      await retryPayout(env, drawId)
      return new Response('Payout retry initiated', { status: 200, headers: corsHeaders })
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders })
  } catch (error) {
    console.error('Request error:', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
}

function handleSSE(env: Env): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode('retry: 10000\n\n'))

      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      const interval = setInterval(async () => {
        try {
          const status = await env.KV_RAFFLE.get('current_draw_status')
          if (status) {
            const drawStatus = JSON.parse(status)
            sendEvent(drawStatus.phase, drawStatus.data)
          }
        } catch (error) {
          console.error('SSE error:', error)
        }
      }, 5000)

      setTimeout(() => {
        clearInterval(interval)
        controller.close()
      }, 300000)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}