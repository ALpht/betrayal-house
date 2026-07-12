export const EventDefinitions = [

    {
        id: 'event_burning_man',
        expansion: 'base',
        type: 'event',
        name: 'Burning Man',
        description: 'A horribly burned man staggers toward you.',
        tags: ['damage'],
        rarity: 'common',
        effect: 'modifyStat',
        stat: 'sanity',
        amount: -1
    },

    {
        id: 'event_secret_passage',
        expansion: 'base',
        type: 'event',
        name: 'Secret Passage',
        description: 'You discover a hidden passage behind the bookshelf.',
        tags: ['movement'],
        rarity: 'common',
        effect: null,
        stat: null,
        amount: null
    },

    {
        id: 'event_spider_webs',
        expansion: 'base',
        type: 'event',
        name: 'Spider Webs',
        description: 'Thick spider webs block your path.',
        tags: ['obstacle'],
        rarity: 'common',
        effect: null,
        stat: null,
        amount: null
    },

    {
        id: 'event_closet_door',
        expansion: 'base',
        type: 'event',
        name: 'Closet Door',
        description: 'A closet door creaks open by itself.',
        tags: ['exploration'],
        rarity: 'common',
        effect: null,
        stat: null,
        amount: null
    },

    {
        id: 'event_footsteps',
        expansion: 'base',
        type: 'event',
        name: 'Footsteps',
        description: 'You hear footsteps behind you, but no one is there.',
        tags: ['psychological'],
        rarity: 'common',
        effect: 'modifyStat',
        stat: 'sanity',
        amount: -1
    },

    {
        id: 'event_creepy_puppet',
        expansion: 'base',
        type: 'event',
        name: 'Creepy Puppet',
        description: 'A doll on the shelf turns its head to watch you.',
        tags: ['psychological'],
        rarity: 'uncommon',
        effect: 'modifyStat',
        stat: 'sanity',
        amount: -1
    },

    {
        id: 'event_strange_noise',
        expansion: 'base',
        type: 'event',
        name: 'Strange Noise',
        description: 'A strange noise echoes from somewhere in the house.',
        tags: ['exploration'],
        rarity: 'common',
        effect: null,
        stat: null,
        amount: null
    },

    {
        id: 'event_cold_wind',
        expansion: 'base',
        type: 'event',
        name: 'Cold Wind',
        description: 'A freezing cold wind blows through the room, extinguishing your light.',
        tags: ['obstacle'],
        rarity: 'common',
        effect: 'modifyStat',
        stat: 'might',
        amount: 1
    },

    {
        id: 'event_vanishing_room',
        expansion: 'base',
        type: 'event',
        name: 'Vanishing Room',
        description: 'The room behind you has disappeared. There is no way back.',
        tags: ['movement', 'obstacle'],
        rarity: 'uncommon',
        effect: null,
        stat: null,
        amount: null
    },

    {
        id: 'event_broken_clock',
        expansion: 'base',
        type: 'event',
        name: 'Broken Clock',
        description: 'All the clocks in the house have stopped at the same time.',
        tags: ['psychological'],
        rarity: 'common',
        effect: null,
        stat: null,
        amount: null
    },

    {
        id: 'event_creaking_floors',
        expansion: 'base',
        type: 'event',
        name: 'Creaking Floors',
        description: 'The floorboards groan under your weight, threatening to give way.',
        tags: ['trap', 'damage'],
        rarity: 'common',
        effect: 'modifyStat',
        stat: 'might',
        amount: -1
    },

    {
        id: 'event_hidden_staircase',
        expansion: 'base',
        type: 'event',
        name: 'Hidden Staircase',
        description: 'Behind a faded tapestry, you find a narrow staircase leading down.',
        tags: ['exploration', 'movement'],
        rarity: 'uncommon',
        effect: null,
        stat: null,
        amount: null
    },

    {
        id: 'event_mirror_vision',
        expansion: 'base',
        type: 'event',
        name: 'Mirror Vision',
        description: 'Your reflection moves independently, mouthing words you cannot hear.',
        tags: ['psychological'],
        rarity: 'common',
        effect: 'modifyStat',
        stat: 'sanity',
        amount: -1
    },

    {
        id: 'event_dusty_bookshelf',
        expansion: 'base',
        type: 'event',
        name: 'Dusty Bookshelf',
        description: 'A book falls from the shelf, its pages filled with strange symbols.',
        tags: ['exploration', 'discovery'],
        rarity: 'common',
        effect: null,
        stat: null,
        amount: null
    },

    {
        id: 'event_collapsed_ceiling',
        expansion: 'base',
        type: 'event',
        name: 'Collapsed Ceiling',
        description: 'Plaster and timber rain down as the ceiling gives way above you.',
        tags: ['trap', 'damage'],
        rarity: 'uncommon',
        effect: 'modifyStat',
        stat: 'might',
        amount: -1
    },

    {
        id: 'event_adrenaline_rush',
        expansion: 'base',
        type: 'event',
        name: 'Adrenaline Rush',
        description: 'Fear sharpens your senses. You feel faster than before.',
        tags: ['buff', 'psychological'],
        rarity: 'uncommon',
        effect: 'modifyStat',
        stat: 'speed',
        amount: 1
    },

    {
        id: 'event_terrible_stench',
        expansion: 'base',
        type: 'event',
        name: 'Terrible Stench',
        description: 'A nauseating odor fills the room, making it hard to think clearly.',
        tags: ['debuff', 'environmental'],
        rarity: 'common',
        effect: 'modifyStat',
        stat: 'knowledge',
        amount: -1
    },

    {
        id: 'event_falling_chandelier',
        expansion: 'base',
        type: 'event',
        name: 'Falling Chandelier',
        description: 'A crystal chandelier crashes to the floor where you stood moments ago.',
        tags: ['trap', 'damage'],
        rarity: 'uncommon',
        effect: 'modifyStat',
        stat: 'might',
        amount: -1
    },

    {
        id: 'event_whispering_walls',
        expansion: 'base',
        type: 'event',
        name: 'Whispering Walls',
        description: 'The walls seem to whisper your name, growing louder with each breath.',
        tags: ['psychological', 'mystery'],
        rarity: 'common',
        effect: 'modifyStat',
        stat: 'sanity',
        amount: -1
    },

    {
        id: 'event_old_diary',
        expansion: 'base',
        type: 'event',
        name: 'Old Diary',
        description: 'A leather-bound diary lies open, its final entry written in blood.',
        tags: ['discovery', 'story'],
        rarity: 'common',
        effect: null,
        stat: null,
        amount: null
    }

];