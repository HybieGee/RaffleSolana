import { Holder } from '../types'

export function calculateWeights(
  holders: Holder[],
  mode: 'sqrt' | 'log',
  maxRatio: number
): Holder[] {
  const minBalance = Math.min(...holders.map(h => h.balance))
  const floorWeight = 0.1

  const weightedHolders = holders.map(holder => {
    let weight: number

    if (mode === 'sqrt') {
      weight = Math.sqrt(holder.balance)
    } else {
      weight = 1 + Math.log10(1 + holder.balance)
    }

    weight = Math.max(weight, floorWeight)

    return { ...holder, weight }
  })

  const minWeight = Math.min(...weightedHolders.map(h => h.weight))
  const maxWeight = Math.max(...weightedHolders.map(h => h.weight))

  if (maxWeight / minWeight > maxRatio) {
    const targetMaxWeight = minWeight * maxRatio
    weightedHolders.forEach(holder => {
      if (holder.weight > targetMaxWeight) {
        holder.weight = targetMaxWeight
      }
    })
  }

  const totalWeight = weightedHolders.reduce((sum, h) => sum + h.weight, 0)

  return weightedHolders.map(holder => ({
    ...holder,
    probability: holder.weight / totalWeight
  }))
}

export function selectWinners(holders: Holder[], count: number): Holder[] {
  const winners: Holder[] = []
  const remainingHolders = [...holders]

  for (let i = 0; i < count && remainingHolders.length > 0; i++) {
    const random = Math.random()
    let cumulative = 0
    let selectedIndex = -1

    for (let j = 0; j < remainingHolders.length; j++) {
      cumulative += remainingHolders[j].probability
      if (random <= cumulative) {
        selectedIndex = j
        break
      }
    }

    if (selectedIndex === -1) {
      selectedIndex = remainingHolders.length - 1
    }

    const winner = remainingHolders.splice(selectedIndex, 1)[0]
    winners.push(winner)

    const newTotalWeight = remainingHolders.reduce((sum, h) => sum + h.weight, 0)
    remainingHolders.forEach(holder => {
      holder.probability = holder.weight / newTotalWeight
    })
  }

  return winners
}