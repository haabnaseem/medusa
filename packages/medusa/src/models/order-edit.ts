import {
  AfterLoad,
  BeforeInsert,
  Column,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm"

import OrderEditingFeatureFlag from "../loaders/feature-flags/order-editing"
import { FeatureFlagEntity } from "../utils/feature-flag-decorators"
import { resolveDbType } from "../utils/db-aware-column"
import { OrderItemChange } from "./order-item-change"
import { BaseEntity } from "../interfaces"
import { generateEntityId } from "../utils"
import { LineItem } from "./line-item"
import { Order } from "./order"

export enum OrderEditStatus {
  CONFIRMED = "confirmed",
  DECLINED = "declined",
  REQUESTED = "requested",
  CREATED = "created",
  CANCELED = "canceled",
}

@FeatureFlagEntity(OrderEditingFeatureFlag.key)
export class OrderEdit extends BaseEntity {
  @Column()
  order_id: string

  @ManyToOne(() => Order, (o) => o.edits)
  @JoinColumn({ name: "order_id" })
  order: Order

  @OneToMany(() => OrderItemChange, (oic) => oic.order_edit, {
    cascade: true,
  })
  changes: OrderItemChange[]

  @Column({ nullable: true })
  internal_note?: string

  @Column()
  created_by: string // customer or user ID

  @Column({ nullable: true })
  requested_by?: string // customer or user ID

  @Column({ type: resolveDbType("timestamptz"), nullable: true })
  requested_at?: Date

  @Column({ nullable: true })
  confirmed_by?: string // customer or user ID

  @Column({ type: resolveDbType("timestamptz"), nullable: true })
  confirmed_at?: Date

  @Column({ nullable: true })
  declined_by?: string // customer or user ID

  @Column({ nullable: true })
  declined_reason?: string

  @Column({ type: resolveDbType("timestamptz"), nullable: true })
  declined_at?: Date

  @Column({ nullable: true })
  canceled_by?: string

  @Column({ type: resolveDbType("timestamptz"), nullable: true })
  canceled_at?: Date

  @OneToMany(() => LineItem, (lineItem) => lineItem.order_edit)
  items: LineItem[]

  // Computed
  shipping_total: number
  discount_total: number
  tax_total: number | null
  total: number
  subtotal: number
  gift_card_total: number
  gift_card_tax_total: number

  difference_due: number

  status: OrderEditStatus

  @BeforeInsert()
  private beforeInsert(): void {
    this.id = generateEntityId(this.id, "oe")
  }

  @AfterLoad()
  loadStatus(): void {
    if (this.requested_at) {
      this.status = OrderEditStatus.REQUESTED
    }
    if (this.declined_at) {
      this.status = OrderEditStatus.DECLINED
    }
    if (this.confirmed_at) {
      this.status = OrderEditStatus.CONFIRMED
    }
    if (this.canceled_at) {
      this.status = OrderEditStatus.CANCELED
    }

    this.status = this.status ?? OrderEditStatus.CREATED
  }
}

/**
 * @schema order_edit
 * title: "Order Edit"
 * description: "Order edit keeps track of order items changes."
 * x-resourceId: order_edit
 * required:
 *   - order_id
 *   - order
 *   - changes
 *   - created_by
 * properties:
 *   id:
 *     type: string
 *     description: The order edit's ID
 *     example: oe_01G8TJSYT9M6AVS5N4EMNFS1EK
 *   order_id:
 *     type: string
 *     description: The ID of the order that is edited
 *     example: order_01G2SG30J8C85S4A5CHM2S1NS2
 *   order:
 *     description: Order object
 *     $ref: "#/components/schemas/order"
 *   changes:
 *     type: array
 *     description: Line item changes array.
 *     items:
 *       $ref: "#/components/schemas/order_item_change"
 *   internal_note:
 *     description: "An optional note with additional details about the order edit."
 *     type: string
 *     example: Included two more items B to the order.
 *   created_by:
 *     type: string
 *     description: "The unique identifier of the user or customer who created the order edit."
 *   requested_by:
 *     type: string
 *     description: "The unique identifier of the user or customer who requested the order edit."
 *   requested_at:
 *     type: string
 *     description: "The date with timezone at which the edit was requested."
 *     format: date-time
 *   confirmed_by:
 *     type: string
 *     description: "The unique identifier of the user or customer who confirmed the order edit."
 *   confirmed_at:
 *     type: string
 *     description: "The date with timezone at which the edit was confirmed."
 *     format: date-time
 *   declined_by:
 *     type: string
 *     description: "The unique identifier of the user or customer who declined the order edit."
 *   declined_at:
 *     type: string
 *     description: "The date with timezone at which the edit was declined."
 *     format: date-time
 *   declined_reason:
 *     description: "An optional note why  the order edit is declined."
 *     type: string
 *   subtotal:
 *     type: integer
 *     description: The total of subtotal
 *     example: 8000
 *   discount_total:
 *     type: integer
 *     description: The total of discount
 *     example: 800
 *   shipping_total:
 *     type: integer
 *     description: The total of the shipping amount
 *     example: 800
 *   gift_card_total:
 *     type: integer
 *     description: The total of the gift card amount
 *     example: 800
 *   gift_card_tax_total:
 *     type: integer
 *     description: The total of the gift card tax amount
 *     example: 800
 *   tax_total:
 *     type: integer
 *     description: The total of tax
 *     example: 0
 *   total:
 *     type: integer
 *     description: The total amount of the edited order.
 *     example: 8200
 *   difference_due:
 *     type: integer
 *     description: The difference between the total amount of the order and total amount of edited order.
 *     example: 8200
 *   items:
 *     type: array
 *     description: Computed line items from the changes.
 *     items:
 *       $ref: "#/components/schemas/line_item"
 */
