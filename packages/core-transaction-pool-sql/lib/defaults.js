'use strict'

module.exports = {
  maxTransactionsPerSender: process.env.ARK_TRANSACTION_POOL_MAX_PER_SENDER || 100,
  allowedSenders: []
}
