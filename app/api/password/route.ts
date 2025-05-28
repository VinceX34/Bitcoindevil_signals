import { NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    
    console.log('Password validation attempt:', {
      received: password ? 'yes' : 'no',
      envPasswordSet: process.env.PASSWORD ? 'yes' : 'no'
    });
    
    if (!password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    // Compare against environment variable
    if (password === process.env.PASSWORD) {
      const response = NextResponse.json<ApiResponse>({ success: true });
      
      // Set the 'authorized' cookie to last for 7 days
      response.cookies.set("authorized", "true", {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === 'production', // Send only over HTTPS in production
        sameSite: 'lax', // Good default for most cases
        maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      });
      
      return response;
    } else {
      // Password was incorrect
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Error validating password:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to validate password', details: errorMessage },
      { status: 500 }
    );
  }
}
