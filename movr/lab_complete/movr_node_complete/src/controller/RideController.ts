import { Repository } from "typeorm";
import { Request, Response } from "express";
import { Rides } from "../entity/Rides";
import { v4 as uuidv4 } from "uuid";
import { Vehicles } from "../entity/Vehicles";
import { LocationHistory } from "../entity/LocationHistory";
import { Calculations } from "../utils/calculations";
import { Transaction } from "../utils/transaction";

class RideController {
    /**
     * Starts a ride on this vehicle for this user.
     *
     * @param body                            JSON of vehicle_id and email
     * @return                                New Ride details
     * @throws NotFoundException              if the vehicle or user is not found
     * @throws InvalidVehicleStateException   if the requested vehicle is not already marked "in use"
     */
    static start = async(req: Request, res: Response) => {
        const vehicle_id = req.body.vehicle_id;
        const email = req.body.email;
        const now = new Date();
        const ride = {id: uuidv4(), vehicle_id:vehicle_id, user_email:email, start_ts:now, end_ts:null};

        if((email === undefined) || (email === '')){
            return res.status(400).json({messages:["Unable to start ride. No user email provided."]})
        }

        if(vehicle_id === undefined){
            return res.status(400).json({messages:["Unable to start ride. No vehicle id provided."]})
        }

        await Transaction.txnWrapper(
            async function (client, next) {
                const locationRepository = await client.manager.getRepository(LocationHistory);
                const rideRepository = await client.manager.getRepository(Rides);
                const vehicleRepository = await client.manager.getRepository(Vehicles);
                const lastchx = await locationRepository
                    .createQueryBuilder("lh")
                    .leftJoinAndSelect(
                        Vehicles,
                        "v",
                        "v.id = lh.vehicle_id"
                    )
                    .where("vehicle_id = :vehicle_id", {vehicle_id : vehicle_id})
                    .andWhere("v.in_use is false")
                    .orderBy("ts", "DESC")
                    .getOne();
                const newLocation = {id: uuidv4(), vehicle_id:vehicle_id, ts:now, latitude:lastchx.latitude, longitude:lastchx.longitude}
                const addLocation = await locationRepository.insert(newLocation);
                vehicleRepository.update({id:vehicle_id},{in_use:true});
                const startRide = await rideRepository.insert(ride);
                /*
                Because of the event subscriber we are able to retrieve the data 
                from the inserted ride before the transaction is complete
                */
                const newRide = await rideRepository.findOne(startRide.identifiers[0].id);
                return next(newRide);
            },
            function (err, results) {
                if (err) {
                    console.error('error performing transaction', err);
                    res.status(500).json({messages:[
                        `Could not start ride on vehicle ${vehicle_id}`, 
                        `Either the vehicle is actively being ridden or it has been deleted from the database`
                    ]});
                } else {
                    if (results) {
                        res.status(200).json({
                            "ride":{
                                "id": results.id,
                                "vehicle_id": results.vehicle_id,
                                "user_email": results.user_email,
                                "start_ts": results.start_ts,
                                "end_ts": results.end_ts
                            },
                            "messages":[`Ride started with vehicle ${vehicle_id}`]});
                    } else {
                        res.status(500).send({messages:[
                            `Could not start ride on vehicle ${vehicle_id}`, 
                            `Either the vehicle is actively being ridden or it has been deleted from the database`
                        ]});
                    }     
                }
            });
    }
        /**
     * Gets a list of all rides for the given user.
     *
     * @param email               email of the user to get rides for
     * @return                    List of all the rides (active and history) for this user
     * @throws 400                if the vehicle or user is not found
     */
    
    static byUser = async(req: Request, res: Response)  => {
        const user_email = req.query.email;
        if((user_email === undefined) || (user_email === '')){
            return res.status(400).json({messages:["No user email provided."]})
        }
        await Transaction.txnWrapper(
            async function (client, next) {
                const rideRepository: Repository<Rides> = client.manager.getRepository(Rides);
                const rides = await rideRepository.createQueryBuilder("rides")
                    .leftJoinAndSelect(
                        Vehicles,
                        "v",
                        "v.id = rides.vehicle_id"
                    )
                    .where("user_email =:user_email", {user_email:user_email})
                    .select([
                        "rides.vehicle_id as id",
                        "rides.user_email as user_email",
                        "rides.start_ts as start_time",
                        "rides.end_ts as end_time",
                        "v.in_use as in_use",
                        "v.vehicle_info as vehicle_info"])
                    .getRawMany();
                return next(rides);
            },
            function (err, results) {
                if (err) {
                    console.error('error performing transaction', err);
                    res.status(500).json({message:err.message});
                } else {
                    const userRides = results;
                    if (userRides.length > 0) {
                        res.status(200).json(userRides);
                    } else {
                        res.status(500).json({message:"No rides found"})
                    }     
                }
            });
    }

    /**
     * Gets the active ride for this vehicle/user combination.
     *
     * @param vehicle_id               the vehicle that the user is riding
     * @param email                    the email address that identifies the user
     * @return                         Json containing details about the ride
     * @throws 500                     if the vehicle or user is not found
     *
     */
    static active = async(req: Request, res: Response)  => {
        const vehicle_id = req.query.vehicle_id;
        const email = req.query.email;
        if (email === undefined) {
            return res.status(400).json({messages:["no email or id"]});
        }
        if (vehicle_id === undefined) {
            return res.status(400).json({messages:["no id"]});
        }
 
        await Transaction.txnWrapper(
            async function (client, next) {
                const repository: Repository<Vehicles> = await client.manager.getRepository(Vehicles);
                const vehicleInfo = await repository.createQueryBuilder("vehicles")
                    .leftJoinAndSelect(
                        LocationHistory,
                        "lh",
                        "lh.vehicle_id = vehicles.id"
                    )
                    .leftJoinAndSelect(
                        Rides,
                        'r',
                        'r.vehicle_id = vehicles.id'
                    )
                    .where ("vehicles.id = :vehicle_id", {vehicle_id:vehicle_id})
                    .andWhere("r.user_email = user_email", {email:email})
                    .andWhere("r.end_ts is null")
                    .andWhere("vehicles.in_use is true")
                    .andWhere("lh.ts = r.start_ts")
                    .select([
                        "vehicles.id as id", 
                        "vehicles.in_use as in_use", 
                        "vehicles.battery as battery",  
                        "vehicles.vehicle_info as vehicle_info", 
                        "lh.ts as last_checkin", 
                        "lh.latitude as last_latitude", 
                        "lh.longitude as last_longitude"])
                    .getRawOne();
                return next(vehicleInfo);
            },
            function (err, results) {
                if (err) {
                    console.error('error performing transaction', err);
                    res.status(500).json({message:"No active rides found."});
                } else {
                    res.status(200).json(results)
                }
            
        });
    }
        /**
     * Ends this specific ride (also calculates time, distance, and speed travelled).
     *
     * @param body                            JSON including vehicle_id, battery, user_email, latitude, longitude
     * @return                                message about the time, speed and distance traveled
     * @throws 400                            if the latitude, longitude and battery values are invalid
     * @throws 500                            if the vehicle or user is not found
     * @throws 500                            if the requested vehicle is not already marked "in use"
     * @throws 500                            if the math calculations result in an error
     */

    static end = async(req: Request, res: Response) => {
        const vehicle_id = req.body.vehicle_id;
        const battery = req.body.battery;
        const user_email = req.body.email;
        const longitude2 = req.body.longitude;
        const latitude2 = req.body.latitude;
        const now = Date();
        const messages = [];

        if ((longitude2 < -180 || longitude2 > 180) || (latitude2 < -90 || latitude2 > 90) || (battery < 0 || battery >100)) {
            if (longitude2 < -180 || longitude2 > 180) {
                messages.push("Longitude must be between -180 and 180")
            }
            if (latitude2 < -90 || latitude2 > 90) {
                messages.push("Latitude must be between -90 and 90")
            }
            if (battery < 0 || battery >100) {
                messages.push("Battery (percent) must be between 0 and 100.")
            }
            return res.status(400).json({messages:messages});
        }
        
        await Transaction.txnWrapper(
            async function (client, next) {
                const rideRepository = await client.manager.getRepository(Rides);
                const locationRepository = await client.manager.getRepository(LocationHistory);
                const vehicleRepository = await client.manager.getRepository(Vehicles);
                const ride = await vehicleRepository.createQueryBuilder("vehicles")
                    .leftJoinAndSelect(
                        LocationHistory,
                        "lh",
                        "lh.vehicle_id = vehicles.id"
                    )
                    .leftJoinAndSelect(
                        Rides,
                        'r',
                        'r.vehicle_id = vehicles.id'
                    )
                    .where ("vehicles.id = :vehicle_id", {vehicle_id:vehicle_id})
                    .andWhere("r.user_email = :user_email", {user_email:user_email})
                    .andWhere("r.end_ts is null")
                    .andWhere("vehicles.in_use is true")
                    .andWhere("lh.ts = r.start_ts")
                    .select(["r.id as id",
                        "r.start_ts as start_ts",
                        "lh.latitude as latitude1",
                        "lh.longitude as longitude1"])
                    .getRawOne();
                const ride_id = ride.id;
                await rideRepository.update({id:ride_id},{end_ts:now});
                await vehicleRepository.update({id:vehicle_id},{in_use:false, battery:battery});
                const location = {id: uuidv4(), vehicle_id: vehicle_id, ts: now, longitude:longitude2, latitude:latitude2}
                await locationRepository.insert(location); 
                return next(ride);
            },
            function (err, results) {
                if (err) {
                    console.error('error performing transaction', err);
                    res.status(500).json({message:`Unable to end ride on vehicle ${vehicle_id}`});
                } else {
                    const userRides = results;
                    const distance= Calculations.calculate_distance({
                        latitude1:+results.latitude1,
                        longitude1:+results.longitude1,
                        latitude2:+latitude2,
                        longitude2:+longitude2
                     });
                     const duration = Calculations.calculate_duration_minutes({
                         startTime:results.start_ts,
                         endTime:now
                     });
                     const speed = Calculations.calculate_velocity({
                        distance: distance,
                        startTime:results.start_ts,
                        endTime:now
                     })
                    res.status(200).json({messages:[
                        `You have completed your ride on vehicle ${vehicle_id}.`, 
                        `You traveled ${distance} km in ${duration} minutes, for an average velocity of ${speed} km/h`
                    ]}); 
                }
        });
    }     
}
export default RideController;
