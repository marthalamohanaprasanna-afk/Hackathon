-- ==============================================================================
-- DocuMind AI: Intelligent Document Processing Platform
-- Seed Data: supabase/seed.sql
-- Description: Realistic business document intelligence demo dataset
-- ==============================================================================

DO $$
DECLARE
    demo_user_id UUID := '00000000-0000-0000-0000-000000000001';
    doc_inv_id UUID := '11111111-1111-1111-1111-111111111111';
    doc_po_id UUID := '22222222-2222-2222-2222-222222222222';
    doc_cntr_id UUID := '33333333-3333-3333-3333-333333333333';
    doc_rcpt_id UUID := '44444444-4444-4444-4444-444444444444';
    doc_rep_id UUID := '55555555-5555-5555-5555-555555555555';
    
    ent_acme UUID := gen_random_uuid();
    ent_nexus UUID := gen_random_uuid();
    ent_inv_no UUID := gen_random_uuid();
    ent_po_no UUID := gen_random_uuid();
    ent_amount_inv UUID := gen_random_uuid();
    ent_amount_po UUID := gen_random_uuid();
    ent_due_date UUID := gen_random_uuid();
BEGIN
    -- 1. Create demo user profile (in case auth.users already has it or for standalone mock)
    INSERT INTO public.profiles (id, display_name)
    VALUES (demo_user_id, 'Sarah Jenkins (Chief Procurement Officer)')
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

    -- 2. Insert Documents
    -- Document 1: Invoice INV-2024-8841 (Acme Technologies to Nexus Global)
    INSERT INTO public.documents (
        id, user_id, file_name, storage_path, mime_type, file_size, file_hash,
        document_type, language, processing_status, review_status, classification_confidence,
        page_count, summary, extracted_text, processed_at
    ) VALUES (
        doc_inv_id, demo_user_id, 'Invoice_INV-2024-8841_AcmeTech.pdf',
        demo_user_id || '/Invoice_INV-2024-8841_AcmeTech.pdf',
        'application/pdf', 142850, 'hash_inv_8841_demo_sha256',
        'invoice', 'en', 'completed', 'approved', 0.98,
        2,
        'Commercial invoice from Acme Technologies Inc. to Nexus Global Logistics for Cloud Infrastructure and Data Engineering consulting services. Total amount due is $45,850.00 payable within net 30 days (due November 15, 2024).',
        'ACME TECHNOLOGIES INC.\n100 Silicon Way, San Jose, CA 95112\n\nINVOICE\nInvoice Number: INV-2024-8841\nDate: October 15, 2024\nDue Date: November 15, 2024\nPO Reference: PO-99420\n\nBilled To:\nNexus Global Logistics\n450 Harbor Boulevard, Seattle, WA 98101\n\nLine Items:\n1. Cloud Migration Consulting Services (120 hrs @ $250/hr): $30,000.00\n2. High-Availability Kubernetes Architecture (50 hrs @ $230/hr): $11,500.00\n\nSubtotal: $41,500.00\nTax (8.0%): $3,320.00\nHandling / Surcharge: $1,030.00\nTotal Due: $45,850.00\nPayment Terms: Net 30 days via Wire Transfer\nBank Account: Silicon Valley First Bank | Routing: 121000358',
        now() - INTERVAL '2 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- Document 2: Purchase Order PO-99420 (Discrepancy test with Invoice)
    INSERT INTO public.documents (
        id, user_id, file_name, storage_path, mime_type, file_size, file_hash,
        document_type, language, processing_status, review_status, classification_confidence,
        page_count, summary, extracted_text, processed_at
    ) VALUES (
        doc_po_id, demo_user_id, 'PurchaseOrder_PO-99420_Nexus.pdf',
        demo_user_id || '/PurchaseOrder_PO-99420_Nexus.pdf',
        'application/pdf', 98400, 'hash_po_99420_demo_sha256',
        'purchase_order', 'en', 'needs_review', 'pending_review', 0.96,
        1,
        'Authorized purchase order issued by Nexus Global Logistics to Acme Technologies Inc. for Enterprise Cloud Modernization. Authorized ceiling total is $42,000.00.',
        'PURCHASE ORDER\nNexus Global Logistics\nPO Number: PO-99420\nDate: October 01, 2024\nVendor: Acme Technologies Inc.\n\nApproved Scope:\n1. Cloud Infrastructure & Migration Consulting: $42,000.00 Cap\n\nTotal Authorized Amount: $42,000.00\nAuthorized By: Sarah Jenkins\nNote: Invoices exceeding authorized purchase order cap require written change-order approval.',
        now() - INTERVAL '1 day'
    ) ON CONFLICT (id) DO NOTHING;

    -- Document 3: Master Services Agreement Contract
    INSERT INTO public.documents (
        id, user_id, file_name, storage_path, mime_type, file_size, file_hash,
        document_type, language, processing_status, review_status, classification_confidence,
        page_count, summary, extracted_text, processed_at
    ) VALUES (
        doc_cntr_id, demo_user_id, 'Master_Services_Agreement_Acme_Nexus.pdf',
        demo_user_id || '/Master_Services_Agreement_Acme_Nexus.pdf',
        'application/pdf', 312000, 'hash_contract_demo_sha256',
        'contract', 'en', 'completed', 'approved', 0.99,
        8,
        'Master Services Agreement executed between Nexus Global Logistics and Acme Technologies Inc. Effective January 1, 2024 with 2-year duration and automatic 12-month renewal unless 60 days advance written termination notice is given.',
        'MASTER SERVICES AGREEMENT\nEffective Date: January 1, 2024\nParties: Nexus Global Logistics ("Client") and Acme Technologies Inc. ("Provider")\nGoverning Law: State of Washington\n\nKey Obligations:\n1. Provider shall maintain 99.9% uptime for managed services.\n2. Invoices shall be payable within Net 30 days.\n3. Confidentiality obligations survive for 5 years post-termination.\n4. Liability cap: aggregate fees paid during previous 12 months.\n5. Renewal: Automatically renews on December 31, 2025 unless either party provides 60 days written notice.',
        now() - INTERVAL '3 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- Document 4: Executive Travel & Lodging Receipt (Arithmetic Discrepancy)
    INSERT INTO public.documents (
        id, user_id, file_name, storage_path, mime_type, file_size, file_hash,
        document_type, language, processing_status, review_status, classification_confidence,
        page_count, summary, extracted_text, processed_at
    ) VALUES (
        doc_rcpt_id, demo_user_id, 'Receipt_GrandHyatt_Oct2024.jpg',
        demo_user_id || '/Receipt_GrandHyatt_Oct2024.jpg',
        'image/jpeg', 241000, 'hash_receipt_demo_sha256',
        'receipt', 'en', 'needs_review', 'pending_review', 0.94,
        1,
        'Hotel stay receipt at Grand Hyatt Seattle for business conference. Total charged is $1,142.50. Discrepancy detected in state lodging tax calculation.',
        'GRAND HYATT SEATTLE\n721 Pine Street, Seattle, WA 98101\nGuest: Sarah Jenkins\nRoom: 1408\nCheck-In: 10/12/2024 | Check-Out: 10/15/2024\n\nRoom Charges (3 nights @ $280.00): $840.00\nRoom Service Dining: $195.00\nValet Parking: $90.00\nLodging Tax (15.6%): $17.50 [FLAGGED: Expected $175.50]\nTotal Charged: $1,142.50\nPayment Method: Visa ending in 4092',
        now() - INTERVAL '5 hours'
    ) ON CONFLICT (id) DO NOTHING;

    -- Document 5: Q3 Financial & Operational Report
    INSERT INTO public.documents (
        id, user_id, file_name, storage_path, mime_type, file_size, file_hash,
        document_type, language, processing_status, review_status, classification_confidence,
        page_count, summary, extracted_text, processed_at
    ) VALUES (
        doc_rep_id, demo_user_id, 'Q3_2024_Financial_Operations_Report.pdf',
        demo_user_id || '/Q3_2024_Financial_Operations_Report.pdf',
        'application/pdf', 540000, 'hash_report_demo_sha256',
        'financial_report', 'en', 'completed', 'approved', 0.97,
        14,
        'Comprehensive Q3 2024 enterprise performance report detailing 24% YoY revenue growth, logistics cost optimizations, and key capital expenditure milestones.',
        'EXECUTIVE FINANCIAL REPORT - Q3 2024\nNexus Global Logistics\nReporting Period: July 1, 2024 - September 30, 2024\nChief Financial Officer: David Vance\n\nKey Metrics:\n- Gross Revenue: $18.4M (+24% YoY)\n- Operating Margin: 18.2%\n- Technology & Cloud Modernization Spend: $1.2M\n- Fleet Fuel Efficiency Savings: $340,000\n\nStrategic Outlook:\nExpansion into Pacific Northwest automated fulfillment hubs scheduled for Q1 2025.',
        now() - INTERVAL '4 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- 3. Insert Extractions
    INSERT INTO public.document_extractions (
        document_id, user_id, schema_version, model_name, extracted_data, field_confidence
    ) VALUES (
        doc_inv_id, demo_user_id, '1.0.0', 'gemini-2.5-flash',
        '{
            "document_type": "invoice",
            "document_title": "Commercial Consulting Invoice",
            "invoice_number": "INV-2024-8841",
            "supplier": { "name": "Acme Technologies Inc.", "address": "100 Silicon Way, San Jose, CA 95112" },
            "customer": { "name": "Nexus Global Logistics", "address": "450 Harbor Boulevard, Seattle, WA 98101" },
            "invoice_date": "2024-10-15",
            "due_date": "2024-11-15",
            "currency": "USD",
            "subtotal": 41500.00,
            "tax": 3320.00,
            "surcharge": 1030.00,
            "total_amount": 45850.00,
            "purchase_order_ref": "PO-99420",
            "line_items": [
                { "description": "Cloud Migration Consulting Services", "quantity": 120, "unit_price": 250.00, "total": 30000.00 },
                { "description": "High-Availability Kubernetes Architecture", "quantity": 50, "unit_price": 230.00, "total": 11500.00 }
            ],
            "payment_terms": "Net 30 days"
        }'::jsonb,
        '{"invoice_number": 0.99, "supplier": 0.98, "total_amount": 0.99, "due_date": 0.97, "line_items": 0.95}'::jsonb
    ) ON CONFLICT DO NOTHING;

    INSERT INTO public.document_extractions (
        document_id, user_id, schema_version, model_name, extracted_data, field_confidence
    ) VALUES (
        doc_po_id, demo_user_id, '1.0.0', 'gemini-2.5-flash',
        '{
            "document_type": "purchase_order",
            "document_title": "Enterprise Cloud Modernization Purchase Order",
            "order_number": "PO-99420",
            "buyer": "Nexus Global Logistics",
            "supplier": "Acme Technologies Inc.",
            "order_date": "2024-10-01",
            "total_amount": 42000.00,
            "authorized_ceiling": 42000.00,
            "authorized_by": "Sarah Jenkins",
            "currency": "USD"
        }'::jsonb,
        '{"order_number": 0.99, "supplier": 0.97, "total_amount": 0.98, "authorized_ceiling": 0.95}'::jsonb
    ) ON CONFLICT DO NOTHING;

    -- 4. Insert Validation Issues
    -- Issue 1: Cross-document discrepancy between Invoice and Purchase Order
    INSERT INTO public.validation_issues (
        document_id, user_id, issue_type, severity, field_path, message, evidence, suggested_action, status
    ) VALUES (
        doc_po_id, demo_user_id, 'cross_document_amount_mismatch', 'critical', 'total_amount',
        'Cross-Document Discrepancy: Invoice INV-2024-8841 claims $45,850.00, which exceeds authorized Purchase Order PO-99420 cap of $42,000.00 by $3,850.00.',
        '{"invoice_id": "' || doc_inv_id || '", "invoice_no": "INV-2024-8841", "invoice_amount": 45850.00, "po_cap": 42000.00, "difference": 3850.00}'::jsonb,
        'Request vendor justification or execute approved change order before authorizing payout.', 'open'
    ) ON CONFLICT DO NOTHING;

    -- Issue 2: Arithmetic tax calculation discrepancy on hotel receipt
    INSERT INTO public.validation_issues (
        document_id, user_id, issue_type, severity, field_path, message, evidence, suggested_action, status
    ) VALUES (
        doc_rcpt_id, demo_user_id, 'arithmetic_inconsistency', 'warning', 'tax_amount',
        'Arithmetic Inconsistency: Extracted lodging tax of $17.50 does not match stated rate of 15.6% on eligible subtotal ($1,125.00), which yields approximately $175.50.',
        '{"subtotal": 1125.00, "extracted_tax": 17.50, "expected_tax": 175.50, "total": 1142.50}'::jsonb,
        'Review original receipt image to confirm handwritten or printed itemization details.', 'open'
    ) ON CONFLICT DO NOTHING;

    -- Issue 3: Upcoming deadline warning on contract
    INSERT INTO public.validation_issues (
        document_id, user_id, issue_type, severity, field_path, message, evidence, suggested_action, status
    ) VALUES (
        doc_cntr_id, demo_user_id, 'obligation_deadline', 'info', 'renewal_terms',
        'Contract Milestone: 60-day written non-renewal notice deadline occurs on November 1, 2025 prior to auto-renewal.',
        '{"effective_date": "2024-01-01", "expiration_date": "2025-12-31", "notice_window_days": 60}'::jsonb,
        'Calendar reminder scheduled for legal & procurement review.', 'open'
    ) ON CONFLICT DO NOTHING;

    -- 5. Insert Document Entities (Knowledge Graph Nodes)
    INSERT INTO public.document_entities (id, document_id, user_id, entity_type, normalized_value, display_value, evidence)
    VALUES
        (ent_acme, doc_inv_id, demo_user_id, 'organization', 'acme_technologies_inc', 'Acme Technologies Inc.', '{"role": "Vendor / Cloud Architecture Provider"}'::jsonb),
        (ent_nexus, doc_inv_id, demo_user_id, 'organization', 'nexus_global_logistics', 'Nexus Global Logistics', '{"role": "Client Enterprise"}'::jsonb),
        (ent_inv_no, doc_inv_id, demo_user_id, 'invoice_number', 'inv_2024_8841', 'INV-2024-8841', '{"amount": "$45,850.00", "status": "Billed"}'::jsonb),
        (ent_po_no, doc_po_id, demo_user_id, 'purchase_order', 'po_99420', 'PO-99420', '{"amount_cap": "$42,000.00"}'::jsonb),
        (ent_amount_inv, doc_inv_id, demo_user_id, 'monetary_amount', 'usd_45850_00', '$45,850.00 USD', '{"type": "Invoice Total"}'::jsonb),
        (ent_due_date, doc_inv_id, demo_user_id, 'deadline', 'date_2024_11_15', 'Nov 15, 2024', '{"type": "Payment Due Date"}'::jsonb)
    ON CONFLICT DO NOTHING;

    -- 6. Insert Entity Relationships (Knowledge Graph Edges)
    INSERT INTO public.entity_relationships (user_id, source_entity_id, target_entity_id, relationship_type, confidence, evidence)
    VALUES
        (demo_user_id, ent_acme, ent_inv_no, 'issued_document', 0.99, '{"source": "Invoice Header"}'::jsonb),
        (demo_user_id, ent_inv_no, ent_nexus, 'billed_to', 0.98, '{"source": "Invoice Customer Section"}'::jsonb),
        (demo_user_id, ent_inv_no, ent_po_no, 'references_po', 0.97, '{"source": "PO Reference Field in INV-2024-8841"}'::jsonb),
        (demo_user_id, ent_nexus, ent_po_no, 'authorized_purchase_order', 0.99, '{"source": "PO Sign-off"}'::jsonb),
        (demo_user_id, ent_inv_no, ent_amount_inv, 'has_financial_value', 1.0, '{"field": "total_amount"}'::jsonb),
        (demo_user_id, ent_inv_no, ent_due_date, 'payment_due_by', 0.98, '{"field": "due_date"}'::jsonb)
    ON CONFLICT DO NOTHING;

    -- 7. Insert Demo Review Event (Audit trail demonstration)
    INSERT INTO public.review_events (
        document_id, user_id, event_type, field_path, previous_value, new_value, notes
    ) VALUES (
        doc_inv_id, demo_user_id, 'field_correction', 'surcharge',
        '"0.00"'::jsonb, '"1030.00"'::jsonb,
        'Corrected fuel & logistics surcharge from line item breakdown.'
    ), (
        doc_inv_id, demo_user_id, 'approved', null, null, null,
        'Verified against project milestone delivery documentation and approved for payment processing.'
    ) ON CONFLICT DO NOTHING;

    -- 8. Insert Demo Chat Session & Messages
    DECLARE
        demo_chat_id UUID := gen_random_uuid();
    BEGIN
        INSERT INTO public.chat_sessions (id, user_id, title)
        VALUES (demo_chat_id, demo_user_id, 'Invoice & Contract Audit Inquiry');

        INSERT INTO public.chat_messages (session_id, user_id, role, content, citations)
        VALUES
        (demo_chat_id, demo_user_id, 'user', 'What is the payment due date for the Acme Technologies invoice, and does it match our purchase order?', '[]'::jsonb),
        (demo_chat_id, demo_user_id, 'assistant',
         'Based on your uploaded documents:

1. **Invoice Due Date**: The invoice **INV-2024-8841** from Acme Technologies Inc. is dated October 15, 2024, with payment due on **November 15, 2024** (Net 30 terms).
2. **Purchase Order Discrepancy**: The invoice references Purchase Order **PO-99420**, but there is a notable discrepancy. The invoice total is **$45,850.00**, whereas PO-99420 specifies an authorized expenditure cap of **$42,000.00**. This exceeds the approved ceiling by **$3,850.00**.

Recommended action: Review the additional $3,850.00 (which includes $1,030 in handling surcharges and additional consulting hours) with procurement before release of payment.',
         '[
            {"document_id": "' || doc_inv_id || '", "document_name": "Invoice_INV-2024-8841_AcmeTech.pdf", "page": 1, "excerpt": "Invoice Number: INV-2024-8841 | Date: October 15, 2024 | Due Date: November 15, 2024 | Total Due: $45,850.00"},
            {"document_id": "' || doc_po_id || '", "document_name": "PurchaseOrder_PO-99420_Nexus.pdf", "page": 1, "excerpt": "PO Number: PO-99420 | Total Authorized Amount: $42,000.00"}
         ]'::jsonb);
    END;
END $$;
