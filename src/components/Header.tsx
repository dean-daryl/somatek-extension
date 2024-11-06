import React from "react";
import image from "../../public/icons/image.png"

export const Header: React.FC = () =>{
    return (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-xs shadow-lg flex items-center">
            <img src={image} alt="image" />
        </div>
    )
}