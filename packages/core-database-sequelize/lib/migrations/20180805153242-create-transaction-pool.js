'use strict'

/**
 * The transaction pool migration.
 * @type {Object}
 */
module.exports = {
  /**
   * Run the migrations.
   * @param  {Sequelize.QueryInterface} queryInterface
   * @param  {Sequelize} Sequelize
   * @return {void}
   */
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('transactionPool', {
      id: {
        allowNull: false,
        autoIncrement: false,
        primaryKey: true,
        type: Sequelize.STRING(64)
      },
      sequence: {
        allowNull: false,
        autoIncrement: true,
        type: Sequelize.BIGINT
      },
      senderPublicKey: {
        allowNull: false,
        type: Sequelize.STRING(66)
      },
      serialized: {
        allowNull: false,
        type: Sequelize.BLOB()
      },
      expireAt: {
        allowNull: true,
        type: Sequelize.DATE
      }
    })

    await queryInterface.addIndex('transactionPool', { fields: ['sequence'], unique: true })

    await queryInterface.addIndex('transactionPool', { fields: ['senderPublicKey'], unique: false })

    await queryInterface.addIndex('transactionPool', { fields: ['expireAt'], unique: false })
  },
  /**
   * Reverse the migrations.
   * @param  {Sequelize.QueryInterface} queryInterface
   * @param  {Sequelize} Sequelize
   * @return {void}
   */
  async down (queryInterface, Sequelize) {
    return queryInterface.dropTable('transactionPool')
  }
}
