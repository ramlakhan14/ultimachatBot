import React from 'react';

import { Modal, ModalOverlay, ModalContent, Text, ModalBody, Box, Flex, Heading, Input, FormLabel, FormControl, Button, FormErrorMessage, useToast } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import styles from "../../AllMail/AllMail.module.scss";
import { createFolder, updateFolder } from '../../../../services/emailassistantservice';

type FormData = {
  folderName: string;
  emailAccountId: string;
  category: string;
};
const EditFolder = ({ isEditOpen, onEditClose, fetchFolderData, folderData }: any) => {

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<FormData>({
    defaultValues: {
      folderName: folderData.folderName,
      emailAccountId: folderData.emailAccountId,
      category: folderData.category
    }
  });

  React.useEffect(() => {
    if (folderData) {
      reset({
        folderName: folderData.folderName,
        emailAccountId: folderData.emailAccountId,
        category: folderData.category,
      });
    }
  }, [folderData, reset]);

  const onSubmit = async (data: FormData) => {
    // console.log("datadata", data);
    const folderFormData = { folderName: data?.folderName, folderId: folderData?._id }
    // console.log(folderFormData);

    try {
      setIsSubmitting(true);
      const res: any = await updateFolder(folderFormData);
      if (res.status === 200) {
        toast({
          title: "Folder updated successfully",
          status: "success",
          isClosable: true,
        });
        reset();
        onEditClose();
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
    onEditClose();
  };
  return (
    <Modal isOpen={isEditOpen} onClose={onEditClose} size='lg'>
      <ModalOverlay />
      <ModalContent>
        <ModalBody>
          <Box maxW="md" mx="auto" mt={10}>
            <Flex direction="column" align="center" mb={6}>
              <Heading size="md">Update Folder</Heading>
              <Box mt={2} textAlign={'center'} fontSize={'14px'} color={'#6C757D'}>Update a folder and link it with your main email for easy access and organization</Box>
            </Flex>
            <hr />
            <form onSubmit={handleSubmit(onSubmit)}>
              <FormControl mt={'20px'} isInvalid={!!errors.folderName}>
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

              <FormControl mt={'20px'} isInvalid={!!errors.emailAccountId}>
                <FormLabel>Email ID</FormLabel>
                <Input
                  {...register('emailAccountId', {
                    // required: 'Email is required',
                    // pattern: {
                    //   value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    //   message: 'Invalid email address'
                    // },
                    // validate: (value, { category }) => {
                    //   if (!value && !category) return 'Either Email ID or Category is required';
                    //   return true;
                    // }
                  })}
                  type="email"
                  readOnly
                  disabled
                  placeholder="Add user email id"
                />
                {/* <FormErrorMessage>
                  {errors.emailAccountId && errors.emailAccountId.message}
                </FormErrorMessage> */}
              </FormControl>
              <Box mt={'20px'}>
                <Text className={styles.textOr}>Or</Text>
              </Box>
              <FormControl mt={'20px'} isInvalid={!!errors.category}>
                <FormLabel>Categories</FormLabel>
                <Input
                  {...register('category', {
                    // required: 'Category is required'
                    // s
                  })}
                  type="text"
                  readOnly
                  disabled
                  placeholder="Enter email category"
                />
                {/* <FormErrorMessage>
                  {errors.category && errors.category.message}
                </FormErrorMessage> */}
              </FormControl>
              <FormControl my={'20px'} textAlign={'right'}>
                <Button
                  onClick={handleCancel}
                  mr={3}
                  fontWeight={400}
                  type="button"
                  colorScheme='gray'
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  fontWeight={400}
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

export default EditFolder;