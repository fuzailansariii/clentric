CREATE TYPE "public"."payment_method_type" AS ENUM('bank', 'paypal', 'wise', 'upi');--> statement-breakpoint
CREATE TABLE "user_payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "payment_method_type" NOT NULL,
	"account_holder" text,
	"bank_name" text,
	"account_number" text,
	"routing_code" text,
	"paypal_email" text,
	"wise_account" text,
	"upi_id" text,
	"show_on_invoices" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_user_payment_method_type" UNIQUE("user_id","type"),
	CONSTRAINT "payment_method_set_up_to_show" CHECK (not "user_payment_methods"."show_on_invoices" or case "user_payment_methods"."type"
        when 'bank' then "user_payment_methods"."account_holder" is not null
          and "user_payment_methods"."bank_name" is not null
          and "user_payment_methods"."account_number" is not null
          and "user_payment_methods"."routing_code" is not null
        when 'paypal' then "user_payment_methods"."paypal_email" is not null
        when 'wise' then "user_payment_methods"."wise_account" is not null
        when 'upi' then "user_payment_methods"."upi_id" is not null
      end)
);
--> statement-breakpoint
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;