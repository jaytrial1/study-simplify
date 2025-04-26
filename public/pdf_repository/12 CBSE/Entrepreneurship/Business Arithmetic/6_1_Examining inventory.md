## 6.1 Examining Inventory

Businesses that maintain an inventory of goods to sell to customers or for use in manufacturing commonly observe a Pareto distribution in the value of that inventory. For example, a company might determine that 20 percent of the products in its inventory account for 80 percent of the total value of inventory. Managing inventory is time-consuming and expensive. By understanding that a few items represent the vast majority of inventory value, a company can get the most bang for its buck by focusing its inventory control efforts on those particular items.

### ABC Analysis

The inventory control technique known as ABC analysis builds on Pareto's Principle. In ABC analysis, a company reviews its inventory and sorts all SKUs into three categories, called "A", "B" and "C" items. The typical breakdown might look like this: "A" inventory: 20 percent of SKUs, 80 percent of value. "B" inventory: 30 percent of SKUs, 15 percent of value. "C" inventory: 50 percent of SKUs, 5 percent of value. Again, a particular company's numbers may be different, but we should be able to discern a similar kind of pattern.

Once a company has conducted its ABC analysis, it can devise an inventory-control strategy that focuses effort where it will have the greatest effect. Items in "A" inventory are tightly controlled, meaning the company keeps close tabs on how much it has in stock; pays close attention to current demand and forecasts for future demand; and carefully plans its ordering so that it neither runs out nor winds up with too much excess inventory that can become obsolete. Items in "B" inventory are also watched closely, but the company reviews its ordering strategy less often. Since items in "C" inventory are the least expensive, the company can order them in bulk and exercise minimal controls; all that really matters is that the company doesn't run out.

A - outstandingly important; B - of average importance; C - relatively unimportant as a basis for a control scheme. Each category can and sometimes should be handled in a different way, with more attention being devoted to category A , less to B , and still less to C .

Thus, applied in the context of inventory, it's a determination of the relative ratios between the number of items and the currency value of the items purchased/consumed on a repetitive basis:

-   $10-20 \%$ of the items ('A' class) account for $70-80 \%$ of the consumption.
-   The next, 15-25\% ('B' class) account for 10-20\% of the consumption and.
-   The balance, 65-75\% ('C' class) account for 5-10\% of the consumption.

'A' class items are closely monitored because of the value involved (70-80\%!).

Suggested policy guidelines for A, B & C classes of items

| (A) items (High <br> Consumption Value) | (B) items (Moderate <br> Consumption Value) | (C) item (Low <br> Consumption Value) |
| :--------------------------------------- | :------------------------------------------ | :------------------------------------ |
| Very strict consumption control          | Moderate control                            | Loose control                         |
| No/very low safety stock                 | Low safety stock                            | High safety stock                     |
| Phased delivery (Weekly)                 | Once in three months                        | Once in 6 months                      |
| Weekly control report                    | Monthly control report                      | Quarterly report                      |
| Maximum follow up                        | Periodic follow up                          | Exceptional                           |
| As many sources as possible              | Two or more reliable                        | Two reliable                          |
| Accurate forecasts                       | Estimates on past data                      | Rough estimate                        |
| Central purchasing / storage             | Combination purchasing                      | Decentralised                         |
| Max. efforts to control LT               | Moderate                                    | Min. clerical efforts                 |
| To be handled by Sr. officers           | Middle level                                | Can be delegated                      |

ABC (Always Better Control) analysis can help you control your inventory better.

### Economic Order Quantity

Keeping aside various other aspects (like security, safety etc) and considering only the monetary or financial implications, how does one design an effective Inventory Control System?

One of the objectives of such a system would be to ensure that there is no stock-out situation. If that were the only criteria, then it is easy to order "large qty" and be very safe. However, there is cost associated with ordering and holding inventory.

Assuming that the future demand is known, one needs to determine when to place an order (Reorder Point) and how much to order (Order Quantity). Reorder point takes due note of the lead time and demand during lead time. For example, if procurement or manufacturing lead time is 2 months, and demand during this period is expected to be 300 units per month, then an order is to be placed when the stock or inventory level reaches 600 pieces. This is the reorder point or level.

Reorder formula $=$ Average daily usage rate $\times$ Lead time in days

Under utopian situation, the new quantity will arrive, just as the stock reaches zero. Real life is not that simple or straightforward. There is variability in the rate of demand (or consumption) as well as in the supply or manufacturing lead time etc. Therefore, it may reach a zero stock status, before the supply arrives. To cater to such variability, the concept of safety stock is used. In this particular case, 150 may be added as safety stock. The reorder level then would be 750 pieces i.e. place new order when the stock level reaches 750 .

For every item, a level of safety stock is determined - keeping the possible variation in lead time and variation in demand during lead time in mind. As we will see later, the Safety Stock has no impact on the Economic Order Quantity. However, both are essential for good inventory control system.

#### Costs

There are two costs involved: One for Ordering (which includes paperwork for placing order, receiving, inspection, warehouse handling etc) and another for holding the inventory or Inventory Carrying Cost (which includes cost of money tied up i.e. interest, space cost, insurance etc).

Let us try to figure out the way to determine EOQ (Economic Order Qty).

The following model assumes:

1.  Future demand is known and is uniform throughout the period.
2.  Unit price of item does not vary with qty ordered. (In real life, the price varies. We will then have to use a different model. That is not discussed here.)

Let us use following symbols:

D: Annual demand for the item (SKU)
P: Cost of placing and receiving one order (does not include purchase price)
C: Inventory carrying cost per unit. This may be derived by multiplying the unit price of the item by the carrying cost expressed as \%age of the unit price.

S: Safety Stock level for the item.
Q\*: Economic order quantity

-   Total number of orders being placed during the year will be $=\frac{p}{Q}$
-   Total ordering cost $=\frac{P D}{Q}$
-   Average inventory $=\mathbf{S}+\frac{Q}{2}$
-   Inventory carrying cost $=\mathbf{C} \times\left(\mathbf{S}+\frac{Q}{2}\right)$

Total annual cost $=\frac{P D}{Q}+\left[C \times\left(S+\frac{Q}{2}\right)\right]$

As you would recollect, the safety stock $S$ is not dependent on $Q$. Irrespective of the value of $Q$, value of $S$ depends on variability of lead time and demand rate. So it can be removed from the equation and get a modified total cost as follows:

Modified annual cost $=\frac{P D}{Q}+\left[C \times \frac{Q}{2}\right]$

Table 4:

The ordering $\operatorname{cost}\left(\frac{P D}{Q}\right)$ and inventory carrying $\operatorname{cost}\left(C \times \frac{Q}{2}\right)$ equal each other when the total cost is the lowest.
$\frac{P D}{Q}=C \times \frac{Q}{2}$
or
$2 \mathrm{PD}=\mathrm{CQ}^{2}$
or
$Q=\sqrt{\frac{2 P D}{C}}$

Therefore,
Those who have background of calculus can easily see that, the EOQ is the value when derivative of modified annual cost is zero. Therefore, differentiating the equation, with respect to Q ,
$O=-\frac{P D}{Q^{2}}+\frac{C}{2}$
or
$\frac{P D}{Q^{2}}=\frac{C}{2}$
or
$\frac{2 P D}{C}=Q^{2}$
or
$Q=\sqrt{\frac{2 P D}{C}}$

Formula for calculating EOQ =

D: Annual Demand for the item (SKU)
P: Cost of placing and receiving one Order (does not include purchase price)
C: Inventory carrying cost per unit. This may be derived by multiplying the unit price of the item by the carrying cost expressed as \%age of the unit price.
S: Safety Stock level for the item.
Q: Economic Order Quantity

$$
Q=\sqrt{\frac{2 P D}{C}}
$$

Couple of numerical examples may further clarify the formula

Example 1:

Annual qty of jeans sold by a shop is 1,200 at the rate of ₹ 100/- per month. Cost of placing an order and receiving goods is ₹ 500/- per order. Inventory holding cost is ₹ 30/- per annum. What is the economic order Qty for the shop keeper?
Here, $D=1,200 ; P=500$ and $C=30$.
So $2 x P x D=12,00,000$
This divided by $30=40,000$.
Square root of which is $=200$
So the EOQ is 200 jeans.

Example 2:

A book shop sells pens - 30,000 qty per year. Demand is uniform. Purchase cost is ₹ 6/- per pen. Holding cost per annum is $20 \%$ of purchase cost. Ordering cost is ₹500/- per order. What should be the EOQ for the shop keeper?
Here, $D=30,000 ; P=500$ and $C=1.2(20 \%$ of 6$)$
So $2 x P x D=3,00,00,000$
This divided by $1.2=2,50,00,000$
Square root of which is $=5,000$
So the EOQ is 5,000 pens.

### Final Note on Inventory Control and EOQ

Inventory control, as explained earlier, has many facets - monetary, physical, safety and many others. It is crucial to understand these aspects in designing an inventory control system. ABC system is one such. There are other different system, including Just-in- time (JIT), perpetual inventory etc. These have not been elaborated here.

Economic ordering quantity is a key factor (but not the only one) in managing any inventory. However, the formula we have arrived at in the earlier pages is a simplified one. There are more advanced formulae available - that take care of seasonality of demand, fluctuations in lead time as well as price breaks based on quantity ordered etc. Those are beyond the scope of current discussion.
