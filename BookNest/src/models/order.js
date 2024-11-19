/* 
    order: FK userID, orderID, total, shipping, status
*/

import { DataTypes } from "sequelize";

export default async (sequelize) => {
    return sequelize.define( // order model
    'order', 
    {
        orderID: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            unique: true,
            allowNull: false
        },
        total: {
            type: DataTypes.FLOAT,
        },
        shipping: {
            type: DataTypes.STRING
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'inactive'
        }
    },
    { // name not pluralized
        freezeTableName: true
    }
);
}