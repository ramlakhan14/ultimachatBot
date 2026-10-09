import React, { useState } from "react";
import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import { ModifyYourCampaignForm } from "./ModifyYourCampaignForm";
import { SuccessfullyModal } from "./SuccessfullyModal";
import { Link } from "react-router-dom";


export const ModifyYourCampaign = ({ isopenModifyYourCampaign, isCloseModifyYourCampaign, campaignId, fetchData, currentPage, itemsPerPages }: any) => {
  // const [isOpen,setIsOpen] = useState()
  const [isOpenSuccessfullyModal, setIsOpenSuccessfullyModal] = useState(false)
  // console.log("campaignId", isopenModifyYourCampaign);
  // console.log("campaignId", campaignId);
  if (campaignId == undefined) {
    return null;
  }
  const onCloseSuccessfullyModal = () => {
    setIsOpenSuccessfullyModal(false);
  }
  const ModifyYourCampaignClose = () => {
    isCloseModifyYourCampaign();
  }

  const SuccessfullyModalOpen = () => {
    setIsOpenSuccessfullyModal(true);
  }
  return (
    <>
      <Modal isOpen={isopenModifyYourCampaign} closeOnOverlayClick={false} onClose={isCloseModifyYourCampaign} scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent maxW="900px">
          <ModalCloseButton _focus={{ outline: "none" }} as={Link} to="/app/email-campaigns" />
          <ModalHeader textAlign="center" fontSize="18px" fontWeight="700" color="#1A202C" pb="8px">
            Modify Your Campaign
          </ModalHeader>
          <ModalBody pt="0px">
            <ModifyYourCampaignForm campaignId={campaignId} ModifyYourCampaignClose={ModifyYourCampaignClose} SuccessfullyModalOpen={SuccessfullyModalOpen} fetchData={fetchData} currentPage={currentPage} itemsPerPages={itemsPerPages} />
          </ModalBody>
        </ModalContent>
      </Modal>
      <SuccessfullyModal isOpens={isOpenSuccessfullyModal} onCloseCancel={onCloseSuccessfullyModal} />
    </>
  )
}