import { sequelize } from "./index.js";
export { user };
/*
    user: userID, name, email, password, shipping
*/
const user = sequelize.define( 
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
        }
    },
    { // don't pluralize table
        freezeTableName: true
    }
);

