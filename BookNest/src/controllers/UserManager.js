
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
        let prev = null, ret = [];
        try {
            // search each key value pair
            attr.forEach(async (obj) => {
                const { arg, value } = obj;
                
                const condition = (arg && value) ? { [arg] : value } : {}; // find attribute of value if given
                const match = await this.#user.findAll({ where: condition });
                
                const regex = new RegExp(prev.userID);
                // find way to remove duplicates
                const dupe = match.filter((value, index, array) => regex.test(match.userID));

                ret = ret.concat(match);
                prev = match;
            });

            if (ret.length == 1) return ret[0];
            return ret;

        } catch (err) {
            throw err;
        }
        
    }

    async LoginUser(email, password)
    {
        try {
            const match = await this.ValidateUsers({'email': email}); // find user

            // more or less than 1 user
            if (Array.isArray(match)) 
            {
                if (match.length === 0) throw 'no user found with that email'; // empty array

                throw 'multiple users exist with that email.'; // duplicate
            }

            // password doesn't match
            if (match.password !== password) throw 'the password you entered is incorrect.';

            
            // login was successful
            console.log('Login was successful');

            return match.userID;
            
        } catch (err) { 
            throw new Error(err);
        }
    }

    async RegisterUser(name, email, password)
    {
        try {

            // see if user exists
            let user = await this.ValidateUsers();

            if (user) throw 'user with that email already exists';

            user = await this.#user.create({
                name: name,
                email: email,
                password: password
            });

            //return
        } catch (err) {
            throw err;
        }
        
    }
}

export default new UserManager;