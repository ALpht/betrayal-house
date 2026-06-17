import { RoomTile } from "../model/RoomTile.js";

export const RoomDefinitions = [

    new RoomTile(
        1,
        "Library",
        {
            north:true,
            east:false,
            south:true,
            west:false
        },
        'event'
    ),

    new RoomTile(
        2,
        "Kitchen",
        {
            north:true,
            east:true,
            south:false,
            west:false
        },
        'item'
    ),

    new RoomTile(
        3,
        "Dining Room",
        {
            north:true,
            east:true,
            south:true,
            west:false
        },
        'event'
    ),

    new RoomTile(
        4,
        "Laboratory",
        {
            north:true,
            east:true,
            south:true,
            west:true
        },
        'omen'
    )
];


