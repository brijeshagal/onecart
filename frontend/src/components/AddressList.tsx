import React from 'react';
import { AddressData } from '@/types';

interface AddressListProps {
  addresses: AddressData[];
  onRemove?: (index: number) => void;
}

export const AddressList: React.FC<AddressListProps> = ({
  addresses,
  onRemove
}) => {
  if (addresses.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        No address added yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {addresses.map((address, index) => (
        <div
          key={index}
          className="p-3 border border-gray-200 rounded-lg bg-gray-50"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="font-medium text-black">{address.name}</p>
              <p className="text-sm text-gray-600">
                {address.display_address}
              </p>
            </div>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="ml-2 text-red-600 hover:text-red-800 text-sm"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
