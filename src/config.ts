export const JWTSECRET = process.env.JWTSECRET || '';
export const JWTEXPIRATION = process.env.JWTEXPIRATION || 7200;
export const httpProviderApi = 'http://eos.greymass.com';
export const ENCRYPTION = {
  key: `${process.env.ENCRYPTION_KEY}`,
  ivLength: Number(process.env.IV_LENGTH || 16)
};

console.log("git sub branch creating")
console.log("git charlse branch creating")
export const GAMES = {
  exampleGame: {
    minBetAmount: 1, // Min bet amount (in coins)
    maxBetAmount: 100000, // Max bet amount (in coins)
    feePercentage: 0.1 // House fee percentage
  },
  race: {
    prizeDistribution: [40, 20, 14.5, 7, 5.5, 4.5, 3.5, 2.5, 1.5, 1] // How is the prize distributed (place = index + 1)
  },
  vip: {
    levels: [
      {
        name: 'None',
        wagerNeeded: 0,
        rakebackPercentage: 0
      },
      {
        name: 'Bronze',
        wagerNeeded: 10000,
        rakebackPercentage: 10
      },
      {
        name: 'Silver',
        wagerNeeded: 15000,
        rakebackPercentage: 12
      },
      {
        name: 'Gold',
        wagerNeeded: 20000,
        rakebackPercentage: 14
      },
      {
        name: 'Diamond',
        wagerNeeded: 30000,
        rakebackPercentage: 16
      }
    ]
  },
  affiliates: {
    earningPercentage: 20 // How many percentage of house edge the affiliator will get
  },
  cups: {
    minBetAmount: 0.1, // Min bet amount (in coins)
    maxBetAmount: 100000, // Max bet amount (in coins)
    feePercentage: 0.05 // House fee percentage
  },
  king: {
    minBetAmount: 0.1, // Min bet amount (in coins)
    maxBetAmount: 100000, // Max bet amount (in coins)
    feePercentage: 0.05, // House fee percentage
    autoChooseTimeout: 30000 // Auto-choser timeout in ms
  },
  shuffle: {
    minBetAmount: 0.1, // Min bet amount (in coins)
    maxBetAmount: 100000, // Max bet amount (in coins)
    feePercentage: 0.05, // House fee percentage
    waitingTime: 30000
  },
  roulette: {
    minBetAmount: 0.1, // Min bet amount (in coins)
    maxBetAmount: 200, // Max bet amount (in coins)
    feePercentage: 0.02, // House fee percentage
    waitingTime: 30000 // Roulette waiting time in ms
  },
  crash: {
    minBetAmount: 0.1, // Min bet amount (in coins)
    maxBetAmount: 200, // Max bet amount (in coins)
    maxProfit: 1000, // Max profit on crash, forces auto cashout
    houseEdge: 0.04 // House edge percentage
  }
};