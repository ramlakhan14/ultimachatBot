import React, { useEffect } from 'react';

import { Modal, ModalOverlay, ModalContent, Text, ModalBody, Box, Flex, Heading, Input, FormLabel, FormControl, Button, FormErrorMessage, useToast } from '@chakra-ui/react';
import { useForm, useWatch } from 'react-hook-form';
import styles from "../../AllMail/AllMail.module.scss";
import { createFolder } from '../../../../services/emailassistantservice';

type FormData = {
  folderName: string;
  emailAccountId: string;
  category: string;
};

const CreateFolder = ({ isOpen, onClose, fetchFolderData }: any) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue
  } = useForm<FormData>();

  // Watch the emailAccountId field to respond to changes
  const emailAccountId = useWatch({
    control,
    name: "emailAccountId",
    defaultValue: ""
  });

  // Check if the email is valid
  const isValidEmail = (email: string) => {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(email);
  };

  // Clear category field when a valid email is entered
  useEffect(() => {
    if (isValidEmail(emailAccountId)) {
      setValue('category', '');
    }
  }, [emailAccountId, setValue]);

  const onSubmit = async (data: FormData) => {
    // console.log(data);
    const folderFormData = { ...data, folderType: "userCreated" as const }
    // console.log(folderFormData);

    try {
      setIsSubmitting(true);
      const res: any = await createFolder(folderFormData);
      if (res.status === 201) {
        toast({
          title: "Folder created successfully",
          status: "success",
          isClosable: true,
        });
        reset();
        onClose();
        fetchFolderData();
      }
    } catch (error: any) {
      toast({
        title: `${error.response.data.message}`,
        status: "error",
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    reset(); // Reset form on cancel
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size='lg'>
      <ModalOverlay />
      <ModalContent>
        <ModalBody py="0">
          <Box maxW="md" mx="auto" mt={6}>
            <Flex direction="column" align="center" mb={6}>
              <Heading size="18px">Create New Folder</Heading>
              <Box mt={2} textAlign={'center'} lineHeight={'150%'} fontSize={'14px'} color={'#6C757D'}>Create a folder and link it with your main email for easy access and organization</Box>
            </Flex>
            <hr />
            <form onSubmit={handleSubmit(onSubmit)}>
              <FormControl mt={'16px'} isInvalid={!!errors.folderName}>
                <FormLabel>Folder Name</FormLabel>
                <Input
                  {...register('folderName', {
                    required: 'Folder name is required',
                    minLength: {
                      value: 2,
                      message: 'Folder name must be at least 3 characters'
                    }
                  })}
                  type="text"
                  placeholder="Enter folder name"
                />
                <FormErrorMessage>
                  {errors.folderName && errors.folderName.message}
                </FormErrorMessage>
              </FormControl>

              <FormControl mt={'16px'} isInvalid={!!errors.emailAccountId}>
                <FormLabel>Email ID</FormLabel>
                <Input
                  {...register('emailAccountId', {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    },
                    validate: (value, { category }) => {
                      if (!value && !category) return 'Email ID is required ';
                      return true;
                    }
                  })}
                  type="email"
                  placeholder="Add user email id"
                />
                <FormErrorMessage>
                  {errors.emailAccountId && errors.emailAccountId.message}
                </FormErrorMessage>
              </FormControl>

              {!isValidEmail(emailAccountId) && (
                <>
                  <Box mt={'16px'}>
                    <Text className={styles.textOr} fontSize={'14px'}>or</Text>
                  </Box>
                  <FormControl mt={'16px'} isInvalid={!!errors.category}>
                    <FormLabel>Categories</FormLabel>
                    <Input
                      {...register('category', {
                        validate: (value, { emailAccountId }) => {
                          if (!value && !emailAccountId) return ' Category is required';
                          return true;
                        }
                      })}
                      type="text"
                      placeholder="Enter email category"
                      disabled={isValidEmail(emailAccountId)}
                    />
                    <FormErrorMessage>
                      {errors.category && errors.category.message}
                    </FormErrorMessage>
                  </FormControl>
                </>
              )}

              <FormControl my={'24px'} textAlign={'right'}>
                <Button
                  onClick={handleCancel}
                  mr={3}
                  fontWeight={500}
                  type="button"
                  colorScheme='gray'
                  color={"#2977ff!important"}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  fontWeight={500}
                  colorScheme='blue'
                  isLoading={isSubmitting}
                >
                  Create Folder
                </Button>
              </FormControl>
            </form>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CreateFolder;