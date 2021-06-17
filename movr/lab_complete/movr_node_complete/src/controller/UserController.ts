import { Repository } from "typeorm";
import { Request, Response, NextFunction } from "express";
import { Users } from "../entity/Users";
import { Transaction } from "../utils/transaction";

export class UserController {
     
    /**
     * Registers a new user (add a User entity).
     *
     * @param body                         JSON containing user email, first_name, last_name, phone_numbers[]
     * @return                             message user is created
     * @throws 500                         if there is an error creating user
     */
    static register = async(req: Request, res: Response) => {
        await Transaction.txnWrapper(
            async function (client, next) {
                const userRepository = await client.manager.getRepository(Users);
                const user = await userRepository.insert(req.body);
                return next(user);
            },
            function (err, results) {
                if (err) {
                    console.error('error performing transaction', err);
                    res.status(500).json({message:"User not created"})
                } else {
                    res.status(200).json({messages:["User successfully created"]});
                }
        });
    }
     /**
     * Gets a user.
     *
     * @param email                the email of the user to retrieve
     * @return                     Json with the details about the user
     * @throws 400                 if no email is provided
     * @throws 500                 if the user does not exist
     */

    static profile = async(req: Request, res: Response) =>{
        const userEmail = req.query.email;
        if(userEmail === undefined){
            return res.status(400).json({messages:["No user email provided."]})
        }
        await Transaction.txnWrapper(
            async function (client, next) {
                const repository: Repository<Users> = await client.manager.getRepository(Users);
                const user = await repository.findOneOrFail(userEmail);
                return next(user);
            },
            function (err, results) {
                if (err) {
                    console.error('error performing transaction', err);
                    res.status(500).send({message:"No user found"})
                } else {
                    res.status(200).json({user:results, messages:[]});  
                }
        });
    }

    /**
     * Logs in user
     *
     * @param email                the email of the user to retrieve
     * @return                     Json of is_authenticated: true
     * @throws 400                 if email is not provided
     */
    
    static login = async(req: Request, res: Response, next:NextFunction) =>{
        const userEmail = req.body.email;
        if (userEmail === undefined) {
            return res.status(400).json({messages:["No email provided."]});
        }
        await Transaction.txnWrapper(
            async function (client, next) {
                const repository: Repository<Users> = await client.manager.getRepository(Users);
                const user: Users = await repository.findOneOrFail(userEmail);
                return next(user);
            },
            function (err, results) {
                if (err) {
                    console.error('error performing transaction', err);
                    res.status(500).json({message:"Unable to log in user"});
                } else {
                    res.status(200).json({is_authenticated:true});  
                }
            });
    }

      /**
     * Deletes a user.
     *
     * @param email                the email of the user to delete
     * @return                     a message indicated the user was deleted
     * @throws NotFoundException   if the email is not provided
     */

    static delete = async(req: Request, res: Response) => {
        const userEmail = req.query.email;
        if (userEmail === undefined) {
            return res.status(400).json({messages:["No email provided."]});
        }
        await Transaction.txnWrapper(
            async function (client, next) {
                const repository: Repository<Users> = await client.manager.getRepository(Users);
                const deletedUser = await repository.delete(userEmail);
                return next(deletedUser);
            },
            function (err, results) {
                if (err) {
                    console.error('error performing transaction', err);
                    res.status(500).json({messages:["No user to delete"]});
                } else {
                    res.status(200).json({messages:["You have successfully deleted your account."]});    
                }
            });
    }
}
export default UserController;
