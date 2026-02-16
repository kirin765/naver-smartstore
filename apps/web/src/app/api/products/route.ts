import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get all products for user
export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ products: data || [] })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json({ error: 'Error fetching products' }, { status: 500 })
  }
}

// Create new product
export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('products')
      .insert({
        user_id: user.id,
        product_name: body.product_name,
        category: body.category,
        brand: body.brand,
        price: body.price,
        keywords: body.keywords || [],
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ product: data }, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'Error creating product' }, { status: 500 })
  }
}
