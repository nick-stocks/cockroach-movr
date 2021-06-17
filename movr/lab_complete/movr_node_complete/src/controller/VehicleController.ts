import { Repository } from "typeorm";
import { Request, Response } from "express";
import { Vehicles } from "../entity/Vehicles";
import { LocationHistory } from "../entity/LocationHistory";
import { v4 as uuidv4 } from "uuid";
import { Transaction } from "../utils/transaction";

class VehicleController {
    /**
     * Gets a list of all vehicles (limited by passed value).
     *
     * @param maxVehicles              the maximum number of vehicle rows to return
     * @return                         a json array containing the vehicle details and it's latest location history
     * @throws                         if you pass 0 or a negative value for the maximum rows to return
     */   
    static all = async(req: Request, res: Response) => {
        const max = req.query.max_vehicles || 20;
        await Transaction.txnWrapper(
            async function (client, next) {
                const repository: Repository<Vehicles> = await client.manager.getRepository(Vehicles);
                const vehicleInfo = await repository.createQueryBuilder("vehicles")
                    .innerJoinAndSelect(
                        LocationHistory,
                        "lh",
                        "lh.vehicle_id = vehicles.id"
                    )  
                    .where(qb => `lh.id IN (${qb.createQueryBuilder()
                        .select('id')
                        .from(LocationHistory, 'lmax')
                        .where("lmax.vehicle_id = vehicles.id")
                        .orderBy('ts', 'DESC')
                        .limit(1)
                        .getQuery()})`)
                    .select([
                        "DISTINCT(vehicles.id) as id", 
                        "vehicles.in_use as in_use", 
                        "vehicles.battery as battery",  
                        "vehicles.vehicle_info as vehicle_info", 
                        "lh.ts as last_checkin", 
                        "lh.latitude as last_latitude", 
                        "lh.longitude as last_longitude"])
                    .orderBy("vehicles.id")
                    .limit(max)
                    .getRawMany();
                return next(vehicleInfo);
            },
            function (err, results) {
                if (err) {
                    console.error('error performing transaction', err);
                    return res.status(500).json({message:"No vehicles found"});
                } else {
                    res.status(200).json(results);
                }
            });
    }
    /**
     * Adds a vehicle.
     *
     * @param body                      JSON of vehcile details
     * @return                          the generated uuid (key) of the added vehicle
     */

    public static add = async(req: Request, res: Response) => {
        const battery = req.body.battery;
        const vehicle_info = {
            color: req.body.color,
            purchase_information: {
                manufacturer: req.body.manufacturer,
                purchase_date: req.body.purchase_date,
                serial_number: req.body.serial_number
            },
            type: req.body.vehicle_type,
            wear: req.body.wear
        };
        const latitude = req.body.latitude;
        const longitude = req.body.longitude;
       
        await Transaction.txnWrapper(
            async function (client, next) {
                const vehicleRepository = await client.manager.getRepository(Vehicles);
                const locationRepository = await client.manager.getRepository(LocationHistory);
                const vehicle= {id: uuidv4(), battery:battery, in_use:false, vehicle_info:vehicle_info};
                const newVehicle = await vehicleRepository.insert(vehicle);
                if (newVehicle) {
                    const location = {id: uuidv4(), vehicle_id: newVehicle.identifiers[0].id, ts:Date(), latitude:latitude, longitude: longitude};
                    const newLocation = await locationRepository.insert(location);
                }
                return next(newVehicle);
            },
            function (err, results) {
                if (err) {
                    console.error('error performing transaction', err);
                    return res.status(500).json({message:"Can not create vehicle"});
                } else {
                    res.status(200).json(results.identifiers[0].id);
                }
        });
    }

        /**
     * Gets a specific vehicle with its location history.
     *
     * @param vehicleId               the uuid of the vehicle to return location history for
     * @return                        json with the vehicle details and a json array of all its past locations
     * @throws 500                    if the passed vehicleId is not in the database
     */

    public static one = async(req: Request, res: Response) => {
        const id = req.params.vehicle_id;
        await Transaction.txnWrapper(
            async function (client, next) {
                const vehicleRepository: Repository<Vehicles> = await client.manager.getRepository(Vehicles);
                const locationRepository: Repository<LocationHistory> = await client.manager.getRepository(LocationHistory);
                const vehicleHistory = await vehicleRepository.findOneOrFail(id);
                const locationHistory = await locationRepository.find({
                    select:["id", "vehicle_id", "ts", "latitude", "longitude"],
                    where: {vehicle_id : id}, 
                    order:{ts:"DESC"}
                });
                vehicleHistory.locationHistory = locationHistory;
                return next(vehicleHistory);
            },
            function (err, results) {
                if (err) {
                    console.error('error performing transaction', err);
                    res.status(500).send("Vehicle not found");
                } else {
                    res.status(200).json(results);
                }
            });
    }
    /**
     * Removes a specific vehicle.
     *
     * @param vehicleId               the uuid of the vehicle to delete
     * @return                        confirmation message
     * @throws 500                   if the passed vehicleId is not in the database
     */

    static delete = async(req: Request, res: Response) => {
        const vehicle_id = req.params.vehicle_id;
        await Transaction.txnWrapper(
            async function (client, next) {
                const repository: Repository<Vehicles> = await client.manager.getRepository(Vehicles);
                const deletedVehicle = await repository.delete(vehicle_id);
                return next(deletedVehicle);
            },
            function (err, results) {
                if (err) {
                    console.error('error performing transaction', err);
                    res.status(500).json({message:"No vehicle to delete"});
                } else {
                    res.status(200).json({messages:[`Deleted vehicle with id ${vehicle_id} from database.`]});
                }
            });
    }
}
export default VehicleController;
