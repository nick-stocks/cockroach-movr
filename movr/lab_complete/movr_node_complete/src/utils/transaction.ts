import async from "async";
import { getConnection } from "typeorm";

export class Transaction {

    public static async txnWrapper(op, next){
        //Connect to database 
        const connection = getConnection();
        const client = connection.createQueryRunner();
        //Set inital value of false for async.doWhilst to continue to run
        var released = false;

        try {
            await client.connect();
            await client.query('BEGIN; SAVEPOINT cockroach_restart');
        } catch (err) {
            next(err);
        }
        //This will automatically retry the function as long as it is retryable
        async.doWhilst(async function (done) {
            var handleError = async function(err){
                console.log('handleError', err)
                //Retryable error code
                if (err.code === '40001'){
                    //Restarts transaction from beginning savepoint point
                    await client.query('ROLLBACK TO SAVEPOINT cockroach_restart');
                    done(null, null);
                    return;
                }
                done(err);
            };
            try {
                //Attempt the function passed that will interact with the database
                await op(client, async function (result) {
                    try {
                        //If it's successful release the savepoint
                        await client.query('RELEASE SAVEPOINT cockroach_restart');
                    } catch (err) {
                        //Check if error is retryable 
                        await handleError(err);
                    }
                    //Set to true so async.dowhilst will quit
                    released = true;
                    done(null, result);
                });
            } catch (err) {
                //check for retryable error
                await handleError(err);
            }
        },
            //Commit and release function
        function (_, cb) {
            return cb(null, !released);
        },
        async function (err, result) {
            try {
                if (err) {
                    await client.query('ROLLBACK');
                    next(err);
                } else {
                    await client.query('COMMIT');
                    next(null, result);
                }
            } catch (err) {
                next(err);
            } finally {
                await client.release();
            }
        });
    };
}