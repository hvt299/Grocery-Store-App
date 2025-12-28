export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            categories: {
                Row: {
                    id: number
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: number
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: number
                    name?: string
                    created_at?: string
                }
            }
            products: {
                Row: {
                    id: number
                    category_id: number | null
                    name: string
                    unit: string
                    price: number
                    cost_price: number
                    stock: number
                    image_url: string | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    category_id?: number | null
                    name: string
                    unit?: string
                    price?: number
                    cost_price?: number
                    stock?: number
                    image_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    category_id?: number | null
                    name?: string
                    unit?: string
                    price?: number
                    cost_price?: number
                    stock?: number
                    image_url?: string | null
                    created_at?: string
                }
            }
            invoices: {
                Row: {
                    id: number
                    total_amount: number
                    payment_method: string
                    note: string | null
                    created_at: string
                }
                Insert: {
                    id?: number
                    total_amount?: number
                    payment_method?: string
                    note?: string | null
                    created_at?: string
                }
                Update: {
                    id?: number
                    total_amount?: number
                    payment_method?: string
                    note?: string | null
                    created_at?: string
                }
            }
            invoice_items: {
                Row: {
                    id: number
                    invoice_id: number
                    product_id: number | null
                    product_name: string | null
                    unit: string | null
                    quantity: number
                    price: number
                    created_at: string
                }
                Insert: {
                    id?: number
                    invoice_id: number
                    product_id?: number | null
                    product_name?: string | null
                    unit?: string | null
                    quantity?: number
                    price?: number
                    created_at?: string
                }
                Update: {
                    id?: number
                    invoice_id?: number
                    product_id?: number | null
                    product_name?: string | null
                    unit?: string | null
                    quantity?: number
                    price?: number
                    created_at?: string
                }
            }
        }
    }
}