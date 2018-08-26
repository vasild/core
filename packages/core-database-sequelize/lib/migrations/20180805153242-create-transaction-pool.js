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
    await queryInterface.createTable('transaction_pool', {
      id: {
        allowNull: false,
        autoIncrement: false,
        type: Sequelize.STRING(64)
      },
      sequence: {
        allowNull: false,
        autoIncrement: true,
        // Naturally `id` should be the primary key, but we need `sequence`
        // to be AUTOINCREMENT and the `autoIncrement: true` seems to be
        // ignored if the column is not the primary key. Thus we make the
        // `sequence` column the primary key.
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      sender_public_key: {
        allowNull: false,
        type: Sequelize.STRING(66)
      },
      serialized: {
        allowNull: false,
        type: Sequelize.BLOB()
      },
      expire_at: {
        allowNull: true,
        type: Sequelize.DATE
      }
    })

    await queryInterface.addIndex('transaction_pool', { fields: ['id'], unique: true })

    await queryInterface.addIndex('transaction_pool', { fields: ['sender_public_key'], unique: false })

    await queryInterface.addIndex('transaction_pool', { fields: ['expire_at'], unique: false })
  },
  /**
   * Reverse the migrations.
   * @param  {Sequelize.QueryInterface} queryInterface
   * @param  {Sequelize} Sequelize
   * @return {void}
   */
  async down (queryInterface, Sequelize) {
    return queryInterface.dropTable('transaction_pool')
  }
}
