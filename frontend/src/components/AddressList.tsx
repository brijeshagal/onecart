import { AddressData } from "@/types";
import React, { useState } from "react";
import { AddressDetailsForm } from "./AddressDetailsForm";

interface AddressListProps {
  addresses: AddressData[];
  onRemove?: (index: number) => void;
  onUpdate?: (index: number, updatedAddress: AddressData) => void;
  primaryPhone?: string;
}

export const AddressList: React.FC<AddressListProps> = ({
  addresses,
  onRemove,
  onUpdate,
  primaryPhone,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  // Auto-open form for addresses without details
  const handleAddDetails = (index: number) => {
    setEditingIndex(index);
  };

  const handleSave = (updatedAddress: AddressData) => {
    if (editingIndex !== null && onUpdate) {
      onUpdate(editingIndex, updatedAddress);
    }
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
  };

  if (addresses.length === 0) {
    return <p className="text-sm text-gray-500 italic">No address added yet</p>;
  }

  return (
    <div className="space-y-4">
      {addresses.map((address, index) => (
        <div key={index}>
          {editingIndex === index ? (
            <AddressDetailsForm
              address={address}
              onSave={handleSave}
              onCancel={handleCancel}
              primaryPhone={primaryPhone}
            />
          ) : (
            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-black">{address.name}</p>
                    {address.address_details_info?.phone && (
                      <span className="text-xs text-gray-500">
                        {address.address_details_info.phone}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    {address.display_address}
                  </p>

                  {/* Show address details if available */}
                  {address.address_details_info && (
                    <div className="text-xs text-gray-500 space-y-1">
                      {address.address_details_info.house && (
                        <p>House: {address.address_details_info.house}</p>
                      )}
                      {address.address_details_info.tower && (
                        <p>Tower: {address.address_details_info.tower}</p>
                      )}
                      {address.address_details_info.floor && (
                        <p>Floor: {address.address_details_info.floor}</p>
                      )}
                      {address.address_details_info.landmark && (
                        <p>Landmark: {address.address_details_info.landmark}</p>
                      )}
                      {address.location_info && address.location_info.state && (
                        <p>
                          {address.location_info.city},{" "}
                          {address.location_info.state} -{" "}
                          {address.location_info.postal_code}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1 ml-2">
                  <button
                    type="button"
                    onClick={() =>
                      address.address_details_info
                        ? handleEdit(index)
                        : handleAddDetails(index)
                    }
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    {address.address_details_info
                      ? "Edit Details"
                      : "Add Details"}
                  </button>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
