/*
    item: itemID, price, name, author, description, stock, cover_image
*/

import { DataTypes } from "sequelize";

export default async (sequelize) => {
    return sequelize.define(
        'item',
        {
            itemID: { // ISBN
                type: DataTypes.BIGINT,
                primaryKey: true,
                autoIncrement: true,
                unique: true,
                allowNull: false
            },
            price: {
                type: DataTypes.FLOAT
            },
            name: {
                type: DataTypes.STRING
            },
            author: {
                type: DataTypes.STRING
            },
            description: {
                type: DataTypes.STRING
            },
            stock: {
                type: DataTypes.INTEGER,
            },
            coverImage: {
                type: DataTypes.STRING
            },
            featured: {
                type: DataTypes.BOOLEAN
            }
        },
        {
            freezeTableName: true
        }
    );
}
