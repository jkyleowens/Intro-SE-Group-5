export { item, order_item, order, user };
export { sequelize };
import { sequelize } from "../../app.js";
import { item } from "./item.js";
import { order_item } from "./order_item.js";
import { order } from "./order.js";
import { user } from "./user.js";

// user has many orders, order belongs to one user
user.hasMany(order,  {
    foreignKey: 'userID'
});
order.belongsTo(user, {
    foreignKey: 'userID'
});

// order has many order_item, order_item belongs to one order
order.hasMany(order_item, {
    foreignKey: 'orderID'
});
order_item.belongsTo(order, {
    foreignKey: 'orderID'
});

// order_item has one item, item has many order_item
item.hasMany(order_item, {
    foreignKey: 'itemID'
});
order_item.belongsTo(item, {
    foreignKey: 'itemID'
});



