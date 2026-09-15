import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

export type InvoicePdfItem = {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
};

export type InvoicePdfData = {
  invoice_number: string;
  status: string;
  currency: string;

  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;

  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;

  payment_provider: string | null;
  paddle_transaction_id: string | null;

  notes: string | null;

  customer_name: string;
  customer_email: string;

  items: InvoicePdfItem[];
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: "#0b1220",
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 48,
    paddingHorizontal: 48,
    paddingBottom: 42,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  brandBlock: {
    width: "65%",
  },

  brand: {
    fontSize: 25,
    fontFamily: "Helvetica-Bold",
    color: "#0b1220",
  },

  brandAccent: {
    color: "#2563eb",
  },

  brandDescription: {
    marginTop: 8,
    maxWidth: 330,
    color: "#667085",
    fontSize: 9.5,
    lineHeight: 1.5,
  },

  website: {
    marginTop: 7,
    color: "#2563eb",
    fontSize: 9,
  },

  mark: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },

  markText: {
    fontSize: 27,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
  },

  titleRow: {
    marginTop: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  invoiceTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
  },

  status: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },

  statusPaid: {
    color: "#16a34a",
  },

  statusUnpaid: {
    color: "#d97706",
  },

  statusCancelled: {
    color: "#dc2626",
  },

  statusDefault: {
    color: "#667085",
  },

  separator: {
    marginTop: 17,
    borderBottomWidth: 1,
    borderBottomColor: "#e8edf3",
  },

  infoGrid: {
    marginTop: 28,
    flexDirection: "row",
    gap: 50,
  },

  infoColumn: {
    flex: 1,
  },

  sectionLabel: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#667085",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 11,
  },

  customerName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },

  mutedLine: {
    fontSize: 9.5,
    color: "#475467",
    marginBottom: 5,
  },

  detailRow: {
    flexDirection: "row",
    marginBottom: 8,
  },

  detailLabel: {
    width: 90,
    color: "#667085",
  },

  detailValue: {
    flex: 1,
    fontFamily: "Helvetica-Bold",
  },

  itemsSection: {
    marginTop: 30,
  },

  table: {
    borderWidth: 1,
    borderColor: "#d8e1ec",
    borderRadius: 6,
    overflow: "hidden",
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    minHeight: 34,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#d8e1ec",
  },

  tableRow: {
    flexDirection: "row",
    minHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: "#e8edf3",
    alignItems: "center",
  },

  qtyCell: {
    width: "10%",
    paddingHorizontal: 10,
  },

  itemCell: {
    width: "46%",
    paddingHorizontal: 10,
  },

  priceCell: {
    width: "22%",
    paddingHorizontal: 10,
    textAlign: "right",
  },

  amountCell: {
    width: "22%",
    paddingHorizontal: 10,
    textAlign: "right",
  },

  headerText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#667085",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  itemTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
  },

  itemDescription: {
    marginTop: 4,
    fontSize: 8.5,
    color: "#667085",
    lineHeight: 1.35,
  },

  totalsWrapper: {
    marginTop: 18,
    alignItems: "flex-end",
  },

  totals: {
    width: 250,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  totalLabel: {
    color: "#667085",
  },

  totalValue: {
    fontFamily: "Helvetica-Bold",
  },

  grandTotal: {
    marginTop: 5,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#d8e1ec",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  grandTotalLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },

  grandTotalValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
  },

  bottomGrid: {
    marginTop: 34,
    flexDirection: "row",
    gap: 36,
  },

  bottomColumn: {
    flex: 1,
  },

  noteText: {
    fontSize: 9,
    color: "#475467",
    lineHeight: 1.5,
  },

  paymentRow: {
    marginBottom: 6,
  },

  paymentLabel: {
    color: "#667085",
    fontSize: 8.5,
  },

  paymentValue: {
    marginTop: 2,
    fontSize: 9,
  },

  transaction: {
    marginTop: 2,
    fontSize: 7.5,
    color: "#475467",
  },

  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#e8edf3",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  footerText: {
    fontSize: 7.5,
    color: "#98a2b3",
  },
});

function formatMoney(
  cents: number,
  currency: string
) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

function getStatusStyle(
  status: string
) {
  switch (
    status.toLowerCase()
  ) {
    case "paid":
      return [
        styles.status,
        styles.statusPaid,
      ];

    case "unpaid":
      return [
        styles.status,
        styles.statusUnpaid,
      ];

    case "cancelled":
    case "refunded":
      return [
        styles.status,
        styles.statusCancelled,
      ];

    default:
      return [
        styles.status,
        styles.statusDefault,
      ];
  }
}

export default function InvoicePdfDocument({
  invoice,
}: {
  invoice: InvoicePdfData;
}) {
  return (
    <Document
      title={`Invoice ${invoice.invoice_number}`}
      author="Embernix"
      subject="Service Invoice"
    >
      <Page
        size="A4"
        style={styles.page}
      >
        <View style={styles.header}>
          <View
            style={
              styles.brandBlock
            }
          >
            <Text style={styles.brand}>
              Ember
              <Text
                style={
                  styles.brandAccent
                }
              >
                nix
              </Text>
            </Text>

            <Text
              style={
                styles.brandDescription
              }
            >
              Digital products and professional
              digital services built for modern
              businesses.
            </Text>

            <Text
              style={
                styles.website
              }
            >
              embernix.org
            </Text>
          </View>

          <View style={styles.mark}>
            <Text
              style={
                styles.markText
              }
            >
              E
            </Text>
          </View>
        </View>

        <View
          style={
            styles.titleRow
          }
        >
          <Text
            style={
              styles.invoiceTitle
            }
          >
            INVOICE
          </Text>

          <Text
            style={getStatusStyle(
              invoice.status
            )}
          >
            {invoice.status}
          </Text>
        </View>

        <View
          style={
            styles.separator
          }
        />

        <View
          style={
            styles.infoGrid
          }
        >
          <View
            style={
              styles.infoColumn
            }
          >
            <Text
              style={
                styles.sectionLabel
              }
            >
              Bill From
            </Text>

            <Text
              style={
                styles.customerName
              }
            >
              Embernix
            </Text>

            <Text
              style={
                styles.mutedLine
              }
            >
              embernix.org
            </Text>

            <Text
              style={
                styles.mutedLine
              }
            >
              Digital Services
            </Text>
          </View>

          <View
            style={
              styles.infoColumn
            }
          >
            <Text
              style={
                styles.sectionLabel
              }
            >
              Bill To
            </Text>

            <Text
              style={
                styles.customerName
              }
            >
              {
                invoice.customer_name
              }
            </Text>

            <Text
              style={
                styles.mutedLine
              }
            >
              {
                invoice.customer_email
              }
            </Text>
          </View>
        </View>

        <View
          style={{
            ...styles.infoGrid,
            marginTop: 30,
          }}
        >
          <View
            style={
              styles.infoColumn
            }
          >
            <Text
              style={
                styles.sectionLabel
              }
            >
              Invoice Details
            </Text>

            <View
              style={
                styles.detailRow
              }
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                Invoice #
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {
                  invoice.invoice_number
                }
              </Text>
            </View>

            <View
              style={
                styles.detailRow
              }
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                Issue Date
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {formatDate(
                  invoice.issued_at
                )}
              </Text>
            </View>

            <View
              style={
                styles.detailRow
              }
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                Status
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {invoice.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.infoColumn
            }
          >
            <Text
              style={
                styles.sectionLabel
              }
            >
              Payment Details
            </Text>

            <View
              style={
                styles.detailRow
              }
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                Due Date
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {formatDate(
                  invoice.due_at
                )}
              </Text>
            </View>

            <View
              style={
                styles.detailRow
              }
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                Currency
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {
                  invoice.currency
                }
              </Text>
            </View>

            <View
              style={
                styles.detailRow
              }
            >
              <Text
                style={
                  styles.detailLabel
                }
              >
                Paid Date
              </Text>

              <Text
                style={
                  styles.detailValue
                }
              >
                {formatDate(
                  invoice.paid_at
                )}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={
            styles.itemsSection
          }
        >
          <View
            style={
              styles.table
            }
          >
            <View
              style={
                styles.tableHeader
              }
            >
              <View
                style={
                  styles.qtyCell
                }
              >
                <Text
                  style={
                    styles.headerText
                  }
                >
                  Qty
                </Text>
              </View>

              <View
                style={
                  styles.itemCell
                }
              >
                <Text
                  style={
                    styles.headerText
                  }
                >
                  Service
                </Text>
              </View>

              <View
                style={
                  styles.priceCell
                }
              >
                <Text
                  style={
                    styles.headerText
                  }
                >
                  Unit Price
                </Text>
              </View>

              <View
                style={
                  styles.amountCell
                }
              >
                <Text
                  style={
                    styles.headerText
                  }
                >
                  Amount
                </Text>
              </View>
            </View>

            {invoice.items.map(
              (
                item,
                index
              ) => (
                <View
                  key={
                    item.id
                  }
                  style={{
                    ...styles.tableRow,
                    ...(index ===
                    invoice.items.length -
                      1
                      ? {
                          borderBottomWidth: 0,
                        }
                      : {}),
                  }}
                >
                  <View
                    style={
                      styles.qtyCell
                    }
                  >
                    <Text>
                      {
                        item.quantity
                      }
                      x
                    </Text>
                  </View>

                  <View
                    style={
                      styles.itemCell
                    }
                  >
                    <Text
                      style={
                        styles.itemTitle
                      }
                    >
                      {
                        item.title
                      }
                    </Text>

                    {item.description && (
                      <Text
                        style={
                          styles.itemDescription
                        }
                      >
                        {
                          item.description
                        }
                      </Text>
                    )}
                  </View>

                  <View
                    style={
                      styles.priceCell
                    }
                  >
                    <Text>
                      {formatMoney(
                        item.unit_price_cents,
                        invoice.currency
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.amountCell
                    }
                  >
                    <Text
                      style={{
                        fontFamily:
                          "Helvetica-Bold",
                      }}
                    >
                      {formatMoney(
                        item.line_total_cents,
                        invoice.currency
                      )}
                    </Text>
                  </View>
                </View>
              )
            )}
          </View>
        </View>

        <View
          style={
            styles.totalsWrapper
          }
        >
          <View
            style={
              styles.totals
            }
          >
            <View
              style={
                styles.totalRow
              }
            >
              <Text
                style={
                  styles.totalLabel
                }
              >
                Subtotal
              </Text>

              <Text
                style={
                  styles.totalValue
                }
              >
                {formatMoney(
                  invoice.subtotal_cents,
                  invoice.currency
                )}
              </Text>
            </View>

            {invoice.discount_cents >
              0 && (
              <View
                style={
                  styles.totalRow
                }
              >
                <Text
                  style={
                    styles.totalLabel
                  }
                >
                  Discount
                </Text>

                <Text
                  style={
                    styles.totalValue
                  }
                >
                  -
                  {formatMoney(
                    invoice.discount_cents,
                    invoice.currency
                  )}
                </Text>
              </View>
            )}

            {invoice.tax_cents >
              0 && (
              <View
                style={
                  styles.totalRow
                }
              >
                <Text
                  style={
                    styles.totalLabel
                  }
                >
                  Tax
                </Text>

                <Text
                  style={
                    styles.totalValue
                  }
                >
                  {formatMoney(
                    invoice.tax_cents,
                    invoice.currency
                  )}
                </Text>
              </View>
            )}

            <View
              style={
                styles.grandTotal
              }
            >
              <Text
                style={
                  styles.grandTotalLabel
                }
              >
                Total
              </Text>

              <Text
                style={
                  styles.grandTotalValue
                }
              >
                {formatMoney(
                  invoice.total_cents,
                  invoice.currency
                )}
              </Text>
            </View>
          </View>
        </View>

        {(invoice.notes ||
          invoice.payment_provider ||
          invoice.paddle_transaction_id) && (
          <View
            style={
              styles.bottomGrid
            }
          >
            <View
              style={
                styles.bottomColumn
              }
            >
              <Text
                style={
                  styles.sectionLabel
                }
              >
                Notes
              </Text>

              <Text
                style={
                  styles.noteText
                }
              >
                {invoice.notes ||
                  "Thank you for choosing Embernix."}
              </Text>
            </View>

            <View
              style={
                styles.bottomColumn
              }
            >
              <Text
                style={
                  styles.sectionLabel
                }
              >
                Payment
              </Text>

              <View
                style={
                  styles.paymentRow
                }
              >
                <Text
                  style={
                    styles.paymentLabel
                  }
                >
                  Provider
                </Text>

                <Text
                  style={
                    styles.paymentValue
                  }
                >
                  {invoice.payment_provider
                    ? invoice.payment_provider.toUpperCase()
                    : "-"}
                </Text>
              </View>

              {invoice.paddle_transaction_id && (
                <View
                  style={
                    styles.paymentRow
                  }
                >
                  <Text
                    style={
                      styles.paymentLabel
                    }
                  >
                    Transaction
                  </Text>

                  <Text
                    style={
                      styles.transaction
                    }
                  >
                    {
                      invoice.paddle_transaction_id
                    }
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View
          style={
            styles.footer
          }
          fixed
        >
          <Text
            style={
              styles.footerText
            }
          >
            Embernix - embernix.org
          </Text>

          <Text
            style={
              styles.footerText
            }
          >
            {invoice.invoice_number}
          </Text>
        </View>
      </Page>
    </Document>
  );
}