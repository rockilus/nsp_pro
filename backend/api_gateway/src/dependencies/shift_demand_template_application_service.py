from fastapi import Depends

from src.dependencies.shift_demand_new_service import (
    get_shift_demand_new_service,
)
from src.dependencies.shift_demand_template_service import (
    get_shift_demand_template_service,
)
from src.services.shift_demand_new_service import ShiftDemandNewService
from src.services.shift_demand_template_application_service import (
    ShiftDemandTemplateApplicationService,
)
from src.services.shift_demand_template_service import (
    ShiftDemandTemplateService,
)


def get_shift_demand_template_application_service(
    template_service: ShiftDemandTemplateService = Depends(
        get_shift_demand_template_service
    ),
    demand_service: ShiftDemandNewService = Depends(get_shift_demand_new_service),
) -> ShiftDemandTemplateApplicationService:
    return ShiftDemandTemplateApplicationService(template_service, demand_service)
