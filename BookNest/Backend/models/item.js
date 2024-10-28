import { sequelize } from "./index.js";
export { item };
/*
    item: itemID, price, name, author, description, stock, cover_image
*/

const item = sequelize.define(
    'item',
    {
        itemID: { // ISBN
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            unique: true,
            allowNull: false
        },
        price: {
            type: DataTypes.INTEGER,
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
        cover_image: {
            type: DataTypes.STRING
        }
    },
    {
        freezeTableName: true
    }
);