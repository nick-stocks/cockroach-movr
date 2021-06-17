import { EntitySubscriberInterface, EventSubscriber, InsertEvent } from 'typeorm';
import { Rides } from '../entity/Rides';
//Subscriber for events in the Rides table
@EventSubscriber()
export class PersonSubscriber implements EntitySubscriberInterface<Rides> {
    listenTo() {
        return Rides;
    }
//Provides the ability to retrieve the data from the table after an insert within the same transaction
    async afterInsert(event: InsertEvent<Rides>) {
        const ride = new Rides();
        const newRide = event.entity;
        await event.manager
            .getRepository(Rides)
            .save(newRide);
    }
}
  