import NextAuth from "next-auth/next";
import GoogleProvider from 'next-auth/providers/google';

import User from "@models/user";
import { connectDB } from "@utils/database";

// Function to generate a valid username
const generateUsername = async (baseName) => {
    // Remove spaces and convert to lowercase
    let username = baseName.replace(/\s+/g, "").toLowerCase();

    // Ensure the base username is at least 4 characters to append numbers
    if (username.length < 4) {
        username = username.padEnd(4, 'x'); // e.g., 'omm' -> 'ommx'
    }

    // Append random 4-digit number to make it at least 8 characters
    let finalUsername = username + Math.floor(1000 + Math.random() * 9000).toString();

    // Check if the generated username is unique
    let user = await User.findOne({ username: finalUsername });
    while (user) {
        // If username exists, generate a new one
        finalUsername = username + Math.floor(1000 + Math.random() * 9000).toString();
        user = await User.findOne({ username: finalUsername });
    }

    return finalUsername;
};

const handler = NextAuth({
    providers:[
        GoogleProvider({
            clientId:process.env.GOOGLE_ID,
            clientSecret:process.env.GOOGLE_CLIENT_SECRET,
        })
    ],
    callbacks:{
        async session({session}){
            const sessionUser = await User.findOne({
                email: session.user.email
            });
            session.user.id = sessionUser._id.toString();
    
            return session;
        },
        async signIn({profile}){
            try {
                //serverless -> lambda -> database
                await connectDB();
                //check if user is already exist
                const userExist = await User.findOne({
                    email: profile.email
                });
                //if not, create a new user
                if(!userExist){
                    // Generate a valid and unique username
                    const generatedUsername = await generateUsername(profile.name);

                    // Create a new user with the generated username
                    await User.create({
                        email: profile.email,
                        username: generatedUsername,
                        image: profile.picture 
                    });

                    console.log(`Created new user with username: ${generatedUsername}`);
                }
                return true;
            } catch (error) {
                console.log(error);
                return false;
            }
        }
    },
    
})

export { handler as GET , handler as POST };