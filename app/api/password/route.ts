import { NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    // Compare against environment variable
    if (password === process.env.PASSWORD) {
      const response = NextResponse.json<ApiResponse>({ success: true });
      
      // Set the 'authorized' cookie
      response.cookies.set("authorized", "true", {
        httpOnly: true,
        path: "/" // Cookie is valid across the entire site
      });
      
      return response;
    } else {
      // Password was incorrect
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error validating password:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Failed to validate password' },
      { status: 500 }
    );
  }
}
