import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    // Compare against your environment variable
    if (password === process.env.PASSWORD) {
      // Prepare a response with the success status
      const res = NextResponse.json({ success: true });

      // Set the 'authorized' cookie
      res.cookies.set("authorized", "true", {
        httpOnly: true,
        path: "/" // Cookie is valid across the entire site
      });
      return res;
    } else {
      // Password was incorrect
      return NextResponse.json({ success: false, error: "Invalid password" });
    }
  } catch (error: any) {
    // Handle any server error
    return NextResponse.json({ success: false, error: error.message });
  }
}
