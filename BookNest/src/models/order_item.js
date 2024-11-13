/* 
    order_item: FK orderID, FK itemID, quantity 
    acts as bridge between item and order. one item can be ordered many times, and order can contain many items.
*/

import { DataTypes } from "sequelize";

export default async (sequelize) => {
    return sequelize.define(
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
}
