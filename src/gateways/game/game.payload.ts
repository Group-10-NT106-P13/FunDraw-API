// type RoomSetting = {
//     host: Player;
//     playerCounts: number;
//     drawTime: number;
//     rounds: number;
//     wordCounts: number;
//     hints: number;
//     words: string[] | null;
// };

// type Room = {
//     state: 'waiting' | 'changing_round' | 'playing' | 'end';
//     setting: RoomSetting;
//     players: Player[];
//     round: number;
//     endRoundTime: number;
//     drawer: Player | null;
//     drawers: Player[];
//     currentWord: string | null;
//     hints: number;
//     scores: PlayerScore[];
// };

// type Player = {
//     id: string;
//     username: string;
//     avatar: string | null;
// };

// type PlayerScore = {
//     id: string;
//     score: number;
// };

// type RoomState = 'waiting' | 'playing' | 'changing_round' | 'end';

export type PayloadEvent = {
    action: string;
    start: {
        X: number;
        Y: number;
    };
    end: {
        X: number;
        Y: number;
    };
    color: string;
};

export const wordsList: string[] = [
    'math',
    'science',
    'english',
    'physics',
    'history',
    'literature',
    'geography',
    'art',
    'physical education',
    'craft',
    'geometry',
    'algebra',
    'friend',
    'classmate',
    'teacher',
    'close friend',
    'best friend',
    'lesson',
    'exercise',
    'test',
    'homework',
    'break',
    'kindergarten',
    'primary school',
    'secondary school',
    'high school',
    'university',
    'college',
    'library',
    'computer room',
    'laboratory',
    'backpack',
    'book',
    'pencil',
    'pen',
    'crayon',
    'ruler',
    'scissors',
    'chair',
    'desk',
    'eraser',
    'rubber',
    'clip',
    'glue',
    'pencil case',
    'paper',
    'marker',
    'compass',
    'globe',
    'dictionary',
    'notebook',
    'doctor',
    'driver',
    'baker',
    'chef',
    'engineer',
    'fire fighter',
    'dentist',
    'accountant',
    'architect',
    'businessman',
    'bank clerk',
    'cashier',
    'pilot',
    'police',
    'interpreter',
    'worker',
    'painter',
    'farmer',
    'company',
    'factory',
    'office',
    'organization',
    'construction site',
    'hospital',
    'farm',
    'bus',
    'taxi',
    'subway',
    'railway train',
    'coach',
    'underground',
    'car',
    'bicycle',
    'bike',
    'motorbike',
    'scooter',
    'truck',
    'lorry',
    'van',
    'tram',
    'boat',
    'ferry',
    'ship',
    'sailboat',
    'cargo ship',
    'airplane',
    'plane',
    'helicopter',
    'glider',
    'hot-air balloon',
    'jet',
    'bend',
    'slow down',
    'slippery road',
    'no entry',
    'no horn',
    'no overtaking',
    'no parking',
    'speed limit',
    'art gallery',
    'alley',
    'bank',
    'barbershop',
    'beauty salon',
    'bookstore',
    'bus stop',
    'bridge',
    'beach',
    'bakery',
    'cathedral',
    'church',
    'cafe',
    'cinema',
    'clinic',
    'dress shop',
    'gift shop',
    'hospital',
    'hotel',
    'park',
    'post office',
    'pharmacy',
    'playground',
    'restaurant',
    'sidewalk',
    'swimming pool',
    'stadium',
    'stationery store',
    'square',
    'supermarket',
    'toy shop',
    'zoo',
    'blouse',
    'jacket',
    'jeans',
    'overcoat',
    'pants',
    'pullover',
    'shirt',
    'sweater',
    'skirt',
    'trousers',
    'dress',
    'pyjama',
    'suit',
    'blazer',
    'raincoat',
    't-shirt',
    'bracelet',
    'earrings',
    'glasses',
    'handbag',
    'tie',
    'necklace',
    'sunglasses',
    'watch',
    'wallet',
    'gloves',
    'boots',
    'sandals',
    'sneaker',
    'transfer',
    'map',
    'price',
    'budget',
    'self-drive',
    'campsite',
    'hotel',
];
