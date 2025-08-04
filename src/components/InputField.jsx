import React from 'react';

const InputField = ({ label, value, onChange, name, placeholder }) => (
    <div className="flex flex-col">
        <label htmlFor={name} className="mb-1 text-sm font-medium text-gray-300">{label}</label>
        <input
            type="number"
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            step="0.01"
        />
    </div>
);

export default InputField;