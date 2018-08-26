'use strict'

const { TransactionPoolInterface } = require('@arkecosystem/core-transaction-pool')
const container = require('@arkecosystem/core-container')
const logger = container.resolvePlugin('logger')
const emitter = container.resolvePlugin('event-emitter')
const ark = require('@arkecosystem/crypto')
const { Transaction } = ark.models

module.exports = class TransactionPool extends TransactionPoolInterface {
  /**
   * Make the transaction pool instance (noop).
   * @return {TransactionPool}
   */
  make () {
    return this
  }

  /**
   * Disconnect from transaction pool (noop).
   * @return {void}
   */
  async disconnect () {
  }

  /**
   * Get the number of transactions in the pool.
   * @return {Number}
   */
  async getPoolSize () {
    await this.__purgeExpired()

    return this.database.getTransactionPoolSize()
  }

  /**
   * Get the number of transactions in the pool from a specific sender
   * @param {String} senderPublicKey
   * @returns {Number}
   */
  async getSenderSize (senderPublicKey) {
    await this.__purgeExpired()

    return this.database.getTransactionPoolSenderSize(senderPublicKey)
  }

  /**
   * Add a transaction to the pool.
   * @param {Transaction} transaction
   */
  async addTransaction (transaction) {
    if (!(transaction instanceof Transaction)) {
      return logger.warn(`Discarded Transaction ${transaction} - Invalid object.`)
    }

    if (await this.transactionExists(transaction.id)) {
      return logger.debug(`Duplicated Transaction ${transaction.id} - Transaction already in pool.`)
    }

    try {
      await this.database.addTransactionToPool(transaction)
    } catch (error) {
      logger.error('Could not add transaction to transaction pool', error, error.stack)

      this.walletManager.revertTransaction(transaction)
    }
  }

  /**
   * Add many transactions to the pool.
   * @param {Array}   transactions, already transformed and verified by transaction guard - must have serialized field
   */
  addTransactions (transactions) {
    transactions.forEach(transaction => { this.addTransaction(transaction) })
  }

  /**
   * Remove a transaction from the pool by transaction object.
   * @param  {Transaction} transaction
   * @return {void}
   */
  async removeTransaction (transaction) {
    await this.database.removeTransactionFromPoolById(transaction.id)
  }

  /**
   * Remove a transaction from the pool by id.
   * @param  {String} id
   * @return {void}
   */
  async removeTransactionById (id) {
    await this.database.removeTransactionFromPoolById(id)
  }

  /**
   * Remove multiple transactions from the pool (by object).
   * @param  {Array} transactions
   * @return {void}
   */
  async removeTransactions (transactions) {
    for (let transaction of transactions) {
      await this.removeTransaction(transaction)
    }
  }

  /**
   * Check whether sender of transaction has exceeded max transactions in queue.
   * @param  {Transaction} transaction
   * @return {(Boolean|void)}
   */
  async hasExceededMaxTransactions (transaction) {
    await this.__purgeExpired()

    if (this.options.allowedSenders.includes(transaction.senderPublicKey)) {
      logger.debug(`Transaction pool allowing ${transaction.senderPublicKey} senderPublicKey, thus skipping throttling.`)
      return false
    }

    const count = await this.database.senderTransactionsCountInPool(transaction.senderPublicKey)
    return count ? count >= this.options.maxTransactionsPerSender : false
  }

  /**
   * Get a transaction by transaction id.
   * @param  {String} id
   * @return {(Transaction|String|void)}
   */
  async getTransaction (id) {
    await this.__purgeExpired()

    const serialized = await this.database.getTransactionFromPool(id)
    if (serialized) {
      return Transaction.fromBytes(serialized)
    }

    return undefined
  }

  /**
   * Get all transactions (serialized) within the specified range.
   * @param  {Number} start
   * @param  {Number} size
   * @return {(Array|void)} array of transactions serialized strings in the specified range
   */
  async getTransactions (start, size) {
    await this.__purgeExpired()

    const transactions = await this.database.transactionsInRangeFromPool(start, size)
    return transactions.map(transaction => transaction.serialized)
  }

  /**
   * Get all transactions (id) within the specified range.
   * @param  {Number} start
   * @param  {Number} size
   * @return {(Array|void)} array of transactions IDs in the specified range
   */
  async getTransactionsIds (start, size) {
    await this.__purgeExpired()

    const transactions = await this.database.transactionsInRangeFromPool(start, size)
    return transactions.map(transaction => transaction.id)
  }

  /**
   * Flush the pool (delete all transactions from it).
   * @return {void}
   */
  async flush () {
    await this.database.flushTransactionPool()
  }

  /**
   * Remove all transactions from the transaction pool belonging to specific sender.
   * @param  {String} senderPublicKey
   * @return {void}
   */
  async removeTransactionsForSender (senderPublicKey) {
    await this.database.removeTransactionsFromPoolForSender(senderPublicKey)
  }

  /**
   * Checks if a transaction exists in the pool.
   * @param {transactionId}
   * @return {Boolean}
   */
  async transactionExists (transactionId) {
    await this.__purgeExpired()

    return this.database.transactionExistsInPool(transactionId)
  }

  /**
   * Remove all transactions from the pool that have expired.
   * @return {void}
   */
  async __purgeExpired () {
    const now = new Date()

    const serializedTransactions = await this.database.getExpiredFromTransactionPool(now)

    serializedTransactions.forEach(serialized => {
      const transaction = Transaction.fromBytes(serialized)

      emitter.emit('transaction.expired', transaction.data)

      this.walletManager.revertTransaction(transaction)
    })

    await this.database.purgeExpiredFromTransactionPool(now)
  }
}
