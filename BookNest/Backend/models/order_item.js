import { sequelize } from "./index.js";
export { order_item };
/* 
    order_item: FK orderID, FK itemID, quantity 
    acts as bridge between item and order. one item can be ordered many times, and order can contain many items.
*/
const order_item = sequelize.define(
    'order_item',
    {
        quantity: {
            type: DataTypes.INTEGER
        }
    },
    {
        freezeTableName: true // name not pluralized
    }
);

