
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

    failure(act, err)
    {
        const msg = 'User manager: ' + act + ' failed: ' + err;
        console.error(msg);
        return msg;
    }

    // update class user model property
    async UpdateModels(sequelize)
    {
        try {

            await sequelize.authenticate();

            this.#user = sequelize.models.user;

        } catch (err) {
            throw new Error(this.failure('getting user model', err));
        }
    }

    // none or many arguments ({'userID', userID}, etc)
    async ValidateUsers(attr, val)
    {
        try {
            // search each key value pair
            const condition = (attr && val) ? { [attr] : val } : {}; // find attribute of value if given
            const arr = await this.#user.findAll({ where: condition });

            if (arr.length == 0) return false;
            if (arr.length == 1) return arr[0];
            return arr;

        } catch (err) {
            throw new Error(this.failure('validating users', err));
        }
        
    }

    async LoginUser(email, password)
    {
        try {
            let match = await this.ValidateUsers([{'email': email}]); // find user
            if (!match) throw 'no user found with that email';

            console.log(match.userID + " " + match.email + " " + match.password);

            // more or less than 1 user
            if (match.length > 1) {
                let user = match[0];
                match = user;
            }
            
            // password doesn't match
            if (match.password !== password) throw 'the password you entered is incorrect.';

            // login was successful
            console.log('Login was successful');

            return match.userID;
            
        } catch (err) { 
            return this.failure('logging in user', err);
        }
    }

    async RegisterUser(username, email, password)
    {
        console.log('Backend processing registration data');
        try {

            // see if user exists
            let user = await this.ValidateUsers([{'email': email}, { 'name': username }]);

            if (user) throw 'user already exists';

            const ret = await this.#user.create({
                name: username,
                email: email,
                password: password
            });

            ret.save();

            return ret.userID;

            //return
        } catch (err) {
            throw new Error(this.failure('registering user', err));
        }
        
    }
}

export default new UserManager;