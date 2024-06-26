import { unstable_noStore as noStore } from "next/cache";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
// Types
import { ObjectiveBreachT, VariableT } from "../../types/schedule_temp";

dayjs.extend(utc);

const apiUrlSchedule = process.env.NEXT_PUBLIC_API_URL + "/schedules";

export const toObjectiveBreachT = (data: any): ObjectiveBreachT => {
  return {
    ...data,
    variables: data.variables.map((variable: any) => {
      const variableT: VariableT = {
        ...variable,
        date: dayjs.utc(variable.date),
      };
      return variableT;
    }),
  };
};
