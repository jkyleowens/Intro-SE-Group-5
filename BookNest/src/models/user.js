/*
    user: userID, name, email, password, shipping
*/

import { DataTypes } from "sequelize";
import { defaultValueSchemable } from "sequelize/lib/utils";

export default async (sequelize) => {
    return sequelize.define( 
        'user',
        {
            userID: {
                type: DataTypes.INTEGER,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true,
                unique: true
            },
            name: {
                type: DataTypes.STRING
            },
            email: {
                type: DataTypes.STRING,
                unique: true
            },
            password: {
                type: DataTypes.STRING
            },
            shipping: {
                type: DataTypes.STRING
            },
            admin: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            }
        },
        { // don't pluralize table
            freezeTableName: true
        }
    );
}