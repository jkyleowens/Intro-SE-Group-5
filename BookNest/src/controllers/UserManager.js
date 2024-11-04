
import AppManager from "../../app.js";
import bcrypt from 'bcryptjs';
import InventoryManager from "./InventoryManager.js";

// backend user management class
class UserManager
{
    #user;

    constructor()
    {
        this.#user = null;
    }

    // update class user model property
    async UpdateModels(sequelize)
    {
        try {

            await sequelize.authenticate();

            this.#user = sequelize.models.user;

        } catch (err) {
            throw new Error(err);
        }
    }

    // none or many arguments ({'userID', userID}, {})
    async ValidateUsers(...attr)
    {
        let arr = new Set, ret = [];
        try {
            // search each key value pair
            attr.forEach(async (obj) => {
                const { arg, value } = obj;
                
                const condition = (arg && value) ? { [arg] : value } : {}; // find attribute of value if given
                const match = await this.#user.findOne({ where: condition });

                arr.add(match);
            });

            return arr;

        } catch (err) {
            throw err;
        }
        
    }

    async LoginUser(email, password)
    {
        try {
            const match = await this.ValidateUsers({'email': email}); // find user

            // more or less than 1 user
            if (match.length === 0) throw 'no user found with that email';
            
            const usr = list.user;

            // password doesn't match
            if (usr.password !== password) throw 'the password you entered is incorrect.';

            
            // login was successful
            console.log('Login was successful');

            return usr.userID;
            
        } catch (err) { 
            throw err;
        }
    }

    async RegisterUser(name, email, password)
    {
        try {

            // see if user exists
            let user = await this.ValidateUsers();

            if (user.length > 0) throw 'user with that email already exists';

            const ret = await this.#user.create({
                name: name,
                email: email,
                password: password
            });

            return ret.userID;

            //return
        } catch (err) {
            throw err;
        }
        
    }
}

export default new UserManager;