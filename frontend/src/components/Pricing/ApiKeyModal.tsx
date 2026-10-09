import React, { useState } from "react";
import { useForm } from 'react-hook-form';
import {
  Modal, ModalBody, ModalCloseButton, ModalContent, ModalHeader, ModalOverlay,
  FormControl,
  FormLabel,
  Input,
  Button,
  FormErrorMessage,
  useToast
} from '@chakra-ui/react';

import { setOpenAiApiKey } from "../../services/openAiApiKey";
import { CurrentUser, User } from "../../services/appConfig";
import { set } from "lodash";

const ApiKeyModal = ({ isOpen, onClose, paymentUrl }: { isOpen: boolean; onClose: () => void; paymentUrl: string }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = React.useState<User>(CurrentUser.get());
  const toast = useToast();
  const handleClose = () => {
    onClose();
    reset();
  };
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      apiKey: user?.openaiKeys?.apiKey || '',
    }
  });
  const onSubmit = async (data: any) => {
    const submittedData = { ...data, useOwnKey: true }

    try {
      setIsSubmitting(true);
      const response = await setOpenAiApiKey(submittedData);

      if (response?.data?.statusCode === 200) {
        reset();
        onClose();
        toast({
          title: `${response?.data?.message}`,
          status: "success",
          isClosable: true,
        })
        setTimeout(() => {
          window.open(paymentUrl, '_blank');
        }, 3000);

      } else {
        toast({
          title: `${response?.data?.message}`,
          status: "error",
          isClosable: true,
        })
      }

    } catch (error: any) {

      toast({
        title: `${error?.response?.data?.message}` || error.message,

        status: "error",
        isClosable: true,
      });

    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <Modal isOpen={isOpen} size="xl" isCentered onClose={handleClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Enter your API key</ModalHeader>
        <ModalCloseButton />
        <ModalBody p={6}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FormControl isInvalid={!!errors.apiKey}>
              <FormLabel htmlFor="apiKey">API Key</FormLabel>
              <Input
                id="apiKey"
                placeholder="Enter your open AI api key (eg. sk-...)"
                type="text"
                {...register('apiKey', {
                  required: 'Open AI API Key is required',
                  pattern: {
                    value: /^sk-.*/, // Example regex for OpenAI API key
                    message: 'Invalid Open AI API Key format',
                  },
                })}
              />
              <FormErrorMessage>
                {errors.apiKey && errors.apiKey.message}
              </FormErrorMessage>
            </FormControl>
            <Button mt={4} colorScheme="blue" type="submit" width="100px" disabled={isSubmitting}>
              Continue
            </Button>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

export default ApiKeyModal