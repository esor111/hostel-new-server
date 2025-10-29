import { Controller, Get, Query, HttpStatus, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { PaginationDto } from "../common/dto/pagination.dto";
import { GetHostelId } from "../hostel/decorators/hostel-context.decorator";
import { HostelAuthWithContextGuard } from "../auth/guards/hostel-auth-with-context.guard";

@ApiTags("dashboard")
@Controller("dashboard")
@UseGuards(HostelAuthWithContextGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  @ApiOperation({ summary: "Get dashboard statistics" })
  @ApiResponse({
    status: 200,
    description: "Dashboard statistics retrieved successfully",
  })
  async getDashboardStats(@GetHostelId() hostelId: string) {
    return await this.dashboardService.getDashboardStats(hostelId);
  }

  @Get("recent-activity")
  @ApiOperation({ summary: "Get recent activities with pagination" })
  @ApiResponse({
    status: 200,
    description: "Recent activities retrieved successfully with pagination",
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              message: { type: 'string' },
              time: { type: 'string' },
              timestamp: { type: 'string' },
              icon: { type: 'string' },
              color: { type: 'string' }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' }
          }
        }
      }
    }
  })
  async getRecentActivity(@Query() paginationDto: PaginationDto, @GetHostelId() hostelId: string) {
    return await this.dashboardService.getRecentActivityPaginated(paginationDto, hostelId);
  }

  @Get("recent-activity/legacy")
  @ApiOperation({ summary: "Get recent activities (legacy endpoint)" })
  @ApiResponse({
    status: 200,
    description: "Recent activities retrieved successfully (legacy format)",
  })
  async getRecentActivityLegacy(@Query("limit") limit: string, @GetHostelId() hostelId: string) {
    const limitNum = limit ? parseInt(limit) : 10;
    return await this.dashboardService.getRecentActivity(limitNum, hostelId);
  }

  @Get("checked-out-dues")
  @ApiOperation({
    summary: "Get students with outstanding dues after checkout",
  })
  @ApiResponse({
    status: 200,
    description: "Checked out students with dues retrieved successfully",
  })
  async getCheckedOutWithDues(@GetHostelId() hostelId: string) {
    const students = await this.dashboardService.getCheckedOutWithDues(hostelId);

    return {
      status: HttpStatus.OK,
      data: students,
    };
  }

  @Get("monthly-revenue")
  @ApiOperation({ summary: "Get monthly revenue data" })
  @ApiResponse({
    status: 200,
    description: "Monthly revenue data retrieved successfully",
  })
  async getMonthlyRevenue(@Query("months") months: number = 12, @GetHostelId() hostelId: string) {
    const revenue = await this.dashboardService.getMonthlyRevenue(months, hostelId);

    return {
      status: HttpStatus.OK,
      data: revenue,
    };
  }

  @Get("overdue-invoices")
  @ApiOperation({ summary: "Get overdue invoices" })
  @ApiResponse({
    status: 200,
    description: "Overdue invoices retrieved successfully",
  })
  async getOverdueInvoices(@GetHostelId() hostelId: string) {
    const invoices = await this.dashboardService.getOverdueInvoices(hostelId);

    return {
      status: HttpStatus.OK,
      data: invoices,
    };
  }

  @Get("summary")
  @ApiOperation({ summary: "Get comprehensive dashboard summary" })
  @ApiResponse({
    status: 200,
    description: "Dashboard summary retrieved successfully",
  })
  async getDashboardSummary(@GetHostelId() hostelId: string) {
    const summary = await this.dashboardService.getDashboardSummary(hostelId);

    return {
      status: HttpStatus.OK,
      data: summary,
    };
  }
}
