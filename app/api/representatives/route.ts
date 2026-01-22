import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://whoismyrepresentative.com';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const zip = searchParams.get('zip');

  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json(
      { error: 'Invalid ZIP code. Please provide a 5-digit ZIP code.' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${API_BASE}/getall_mems.php?zip=${zip}&output=json`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching representatives:', error);
    return NextResponse.json(
      { error: 'Failed to fetch representative data. Please try again.' },
      { status: 500 }
    );
  }
}
