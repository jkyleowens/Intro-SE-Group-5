import { sequelize } from "./index.js";
export { order };
/* 
    order: FK userID, orderID, total, shipping, status
*/

const order = sequelize.define( // order model
    'order', 
    {
        orderID: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            unique: true,
            allowNull: false
        },
        total: {
            type: DataTypes.INTEGER,
        },
        shipping: {
            type: DataTypes.STRING
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'Pending'
        }
    },
    { // name not pluralized
        freezeTableName: true
    }
);