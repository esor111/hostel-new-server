import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { DiscountsService } from "./discounts.service";
import { CreateDiscountDto, ApplyDiscountDto } from "./dto/create-discount.dto";
import { UpdateDiscountDto } from "./dto/update-discount.dto";

@ApiTags("discounts")
@Controller("discounts")
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get()
  @ApiOperation({ summary: "Get all discounts" })
  @ApiResponse({
    status: 200,
    description: "List of discounts retrieved successfully",
  })
  async getDiscounts(@Query() query: any) {
    const result = await this.discountsService.findAll(query);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      result: result,
    };
  }

  @Get("stats")
  @ApiOperation({ summary: "Get discount statistics" })
  @ApiResponse({
    status: 200,
    description: "Discount statistics retrieved successfully",
  })
  async getDiscountStats() {
    const stats = await this.discountsService.getStats();

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      stats: stats,
    };
  }

  @Get("types")
  @ApiOperation({ summary: "Get discount types" })
  @ApiResponse({
    status: 200,
    description: "Discount types retrieved successfully",
  })
  async getDiscountTypes() {
    const types = await this.discountsService.getDiscountTypes();

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: types,
    };
  }

  @Get("student/:studentId")
  @ApiOperation({ summary: "Get discounts by student ID" })
  @ApiResponse({
    status: 200,
    description: "Student discounts retrieved successfully",
  })
  async getDiscountsByStudentId(@Param("studentId") studentId: string) {
    const discounts = await this.discountsService.findByStudentId(studentId);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: discounts,
    };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get discount by ID" })
  @ApiResponse({ status: 200, description: "Discount retrieved successfully" })
  @ApiResponse({ status: 404, description: "Discount not found" })
  async getDiscountById(@Param("id") id: string) {
    const discount = await this.discountsService.findOne(id);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: discount,
    };
  }

  @Post()
  @ApiOperation({ summary: "Create new discount" })
  @ApiResponse({ status: 201, description: "Discount created successfully" })
  async createDiscount(@Body() createDiscountDto: CreateDiscountDto) {
    const discount = await this.discountsService.create(createDiscountDto);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.CREATED,
      data: discount,
    };
  }

  @Put(":id")
  @ApiOperation({ summary: "Update discount" })
  @ApiResponse({ status: 200, description: "Discount updated successfully" })
  async updateDiscount(
    @Param("id") id: string,
    @Body() updateDiscountDto: UpdateDiscountDto
  ) {
    const discount = await this.discountsService.update(id, updateDiscountDto);

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: discount,
    };
  }

  @Post("apply")
  @ApiOperation({ summary: "Apply discount to student" })
  @ApiResponse({ status: 200, description: "Discount applied successfully" })
  async applyDiscount(@Body() applyDiscountDto: ApplyDiscountDto) {
    const result = await this.discountsService.applyDiscount(
      applyDiscountDto.studentId,
      applyDiscountDto
    );

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result,
    };
  }

  @Put(":id/expire")
  @ApiOperation({ summary: "Expire discount" })
  @ApiResponse({ status: 200, description: "Discount expired successfully" })
  async expireDiscount(@Param("id") id: string, @Body() expireDto: any) {
    const result = await this.discountsService.expireDiscount(
      id,
      expireDto.expiredBy
    );

    // Return EXACT same format as current Express API
    return {
      status: HttpStatus.OK,
      data: result,
    };
  }
}
