
import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

type InvoicePdfItem = {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

export type InvoicePdfData = {
  invoice_number: string;
  order_number: string | null;
  status: string;
  currency: string;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  issued_at: string | null;
  paid_at: string | null;
  payment_provider: string | null;
  customer_name: string;
  customer_email: string;
  items: InvoicePdfItem[];
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 45,
    paddingHorizontal: 42,
    backgroundColor: "#ffffff",
    color: "#172033",
    fontFamily: "Helvetica",
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  brand: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#111827",
  },
  brandDescription: {
    marginTop: 5,
    fontSize: 9,
    color: "#6b7280",
  },
  receiptLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#374151",
    textAlign: "right",
  },
  receiptNumber: {
    marginTop: 6,
    fontSize: 9,
    color: "#6b7280",
    textAlign: "right",
  },
  statusArea: {
    paddingTop: 22,
    paddingBottom: 20,
  },
  status: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
    backgroundColor: "#ecfdf5",
    color: "#047857",
    fontSize: 10,
    fontWeight: "bold",
  },
  intro: {
    marginTop: 12,
    fontSize: 10,
    lineHeight: 1.5,
    color: "#6b7280",
  },
  columns: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  column: {
    width: "47%",
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 9,
    fontWeight: "bold",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: {
    marginBottom: 5,
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827",
  },
  text: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#4b5563",
  },
  detailsBox: {
    marginBottom: 26,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 9,
    color: "#6b7280",
  },
  detailValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "right",
    maxWidth: "65%",
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  productColumn: {
    width: "49%",
    paddingRight: 8,
  },
  quantityColumn: {
    width: "11%",
    textAlign: "center",
  },
  priceColumn: {
    width: "20%",
    textAlign: "right",
  },
  amountColumn: {
    width: "20%",
    textAlign: "right",
  },
  tableHeading: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
  },
  productName: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#111827",
  },
  productDescription: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 1.4,
    color: "#6b7280",
  },
  cell: {
    fontSize: 9,
    color: "#374151",
  },
  totalsContainer: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totals: {
    width: "48%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
  },
  totalLabel: {
    fontSize: 10,
    color: "#6b7280",
  },
  totalValue: {
    fontSize: 10,
    color: "#111827",
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 38,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  footerTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#111827",
  },
  footerText: {
    marginTop: 7,
    fontSize: 9,
    lineHeight: 1.6,
    color: "#6b7280",
  },
  pageNumber: {
    position: "absolute",
    bottom: 22,
    right: 42,
    fontSize: 8,
    color: "#9ca3af",
  },
});

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(cents / 100);
  } catch {
    return `${currency || "USD"} ${(cents / 100).toFixed(2)}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function InvoicePdfDocument({
  invoice,
}: {
  invoice: InvoicePdfData;
}) {
  const isPaid = invoice.status === "paid";
  const hasDiscount = invoice.discount_cents > 0;
  const hasTax = invoice.tax_cents > 0;

  return (
    <Document
      title={`Purchase Receipt ${invoice.invoice_number}`}
      author="Embernix"
      subject="Digital product purchase receipt"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Embernix</Text>
            <Text style={styles.brandDescription}>
              Digital Products Marketplace
            </Text>
          </View>

          <View>
            <Text style={styles.receiptLabel}>
              PURCHASE RECEIPT
            </Text>
            <Text style={styles.receiptNumber}>
              {invoice.invoice_number}
            </Text>
          </View>
        </View>

        <View style={styles.statusArea}>
          <Text
            style={[
              styles.status,
              !isPaid
                ? {
                    backgroundColor: "#f3f4f6",
                    color: "#4b5563",
                  }
                : {},
            ]}
          >
            {invoice.status.toUpperCase()}
          </Text>

          <Text style={styles.intro}>
            {isPaid
              ? "Your digital product purchase was completed successfully."
              : "Purchase record details."}
          </Text>
        </View>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>
              Store
            </Text>
            <Text style={styles.name}>Embernix</Text>
            <Text style={styles.text}>
              app.embernix.org
            </Text>
            <Text style={styles.text}>
              support@embernix.org
            </Text>
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionTitle}>
              Customer
            </Text>
            <Text style={styles.name}>
              {invoice.customer_name}
            </Text>
            <Text style={styles.text}>
              {invoice.customer_email}
            </Text>
          </View>
        </View>

        <View style={styles.detailsBox}>
          <Text style={styles.sectionTitle}>
            Purchase details
          </Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Receipt number
            </Text>
            <Text style={styles.detailValue}>
              {invoice.invoice_number}
            </Text>
          </View>

          {invoice.order_number && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                Order number
              </Text>
              <Text style={styles.detailValue}>
                {invoice.order_number}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Purchase date
            </Text>
            <Text style={styles.detailValue}>
              {formatDate(invoice.paid_at || invoice.issued_at)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Payment method
            </Text>
            <Text style={styles.detailValue}>
              {invoice.payment_provider?.toUpperCase() || "—"}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              Currency
            </Text>
            <Text style={styles.detailValue}>
              {invoice.currency}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.productColumn, styles.tableHeading]}>
              Product
            </Text>
            <Text style={[styles.quantityColumn, styles.tableHeading]}>
              Qty
            </Text>
            <Text style={[styles.priceColumn, styles.tableHeading]}>
              Unit price
            </Text>
            <Text style={[styles.amountColumn, styles.tableHeading]}>
              Amount
            </Text>
          </View>

          {invoice.items.map((item) => (
            <View
              key={item.id}
              style={styles.tableRow}
              wrap={false}
            >
              <View style={styles.productColumn}>
                <Text style={styles.productName}>
                  {item.title}
                </Text>
                {item.description && (
                  <Text style={styles.productDescription}>
                    {item.description}
                  </Text>
                )}
              </View>

              <Text style={[styles.quantityColumn, styles.cell]}>
                {item.quantity}
              </Text>

              <Text style={[styles.priceColumn, styles.cell]}>
                {formatMoney(
                  item.unit_price_cents,
                  invoice.currency
                )}
              </Text>

              <Text style={[styles.amountColumn, styles.cell]}>
                {formatMoney(
                  item.line_total_cents,
                  invoice.currency
                )}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsContainer}>
          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                Subtotal
              </Text>
              <Text style={styles.totalValue}>
                {formatMoney(
                  invoice.subtotal_cents,
                  invoice.currency
                )}
              </Text>
            </View>

            {hasDiscount && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Discount
                </Text>
                <Text style={styles.totalValue}>
                  -{formatMoney(
                    invoice.discount_cents,
                    invoice.currency
                  )}
                </Text>
              </View>
            )}

            {hasTax && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Tax
                </Text>
                <Text style={styles.totalValue}>
                  {formatMoney(
                    invoice.tax_cents,
                    invoice.currency
                  )}
                </Text>
              </View>
            )}

            <View style={styles.grandTotal}>
              <Text style={styles.grandTotalLabel}>
                {isPaid ? "Total paid" : "Total"}
              </Text>
              <Text style={styles.grandTotalValue}>
                {formatMoney(
                  invoice.total_cents,
                  invoice.currency
                )}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>
            Thank you for your purchase!
          </Text>
          <Text style={styles.footerText}>
            You can access your purchased digital products from your Embernix dashboard.
          </Text>
          <Text style={styles.footerText}>
            This is an Embernix purchase receipt for your records.
            Official payment and tax documentation is provided by
            the payment processor, Creem, where applicable.
          </Text>
          <Text style={styles.footerText}>
            Questions about your purchase? Contact support@embernix.org.
          </Text>
        </View>

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
