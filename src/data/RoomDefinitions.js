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
    ),

    new RoomTile(
        5,
        "Storage Closet",
        {
            north:true,
            east:false,
            south:false,
            west:false
        },
        null
    ),

    new RoomTile(
        6,
        "Grand Hall",
        {
            north:true,
            east:true,
            south:true,
            west:true
        },
        null
    )
];


