type ShiftDemandT = {
    dayIndex: number; // from 0 to 6
    shiftId: string;
    quantity: number;
};

type CoverageT = {
    id: string;
    name: string;
    dateStart: Date;
    dateEnd: Date;
    shiftDemands: ShiftDemandT[];
};

type Shift = {
    id: string;
    name: string;
    // ... any other properties of a shift
};